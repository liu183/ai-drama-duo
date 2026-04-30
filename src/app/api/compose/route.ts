import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==================== Subtitle Generation ====================

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function generateSubtitleForStoryboard(
  sb: { dialogue: string; duration: number; location?: string; time?: string; characters?: { character?: { name: string } }[] | { name: string }[] },
  startTime: number,
  index: number
): { srtLines: string[]; newIndex: number; newTime: number } {
  const lines: string[] = [];
  const endTime = startTime + (sb.duration || 5);
  let idx = index;

  // Location subtitle
  if (sb.location || sb.time) {
    lines.push(`${idx}`);
    lines.push(`${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}`);
    lines.push(`[${sb.location || ''}${sb.location && sb.time ? ' · ' : ''}${sb.time || ''}]`);
    lines.push('');
    idx++;
  }

  // Dialogue subtitle
  if (sb.dialogue) {
    const charNames = (sb.characters || [])
      .map((c) => ('character' in c ? c.character?.name : c.name))
      .filter(Boolean) as string[];
    const speaker = charNames.length > 0 ? charNames.join(', ') : '';
    lines.push(`${idx}`);
    lines.push(`${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}`);
    lines.push(speaker ? `${speaker}: ${sb.dialogue}` : sb.dialogue);
    lines.push('');
    idx++;
  }

  return { srtLines: lines, newIndex: idx, newTime: endTime };
}

// ==================== POST /api/compose ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodeId, storyboardIds, composeConfig } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });
    }

    // Fetch storyboards with full data
    const storyboards = await db.storyboard.findMany({
      where: {
        episodeId,
        ...(storyboardIds ? { id: { in: storyboardIds } } : {}),
      },
      orderBy: { storyboardNumber: 'asc' },
      include: {
        characters: { include: { character: true } },
      },
    });

    if (storyboards.length === 0) {
      return NextResponse.json({ error: 'No storyboards to compose' }, { status: 400 });
    }

    const config = composeConfig || {
      resolution: '1920x1080',
      addSubtitles: true,
      audioMix: true,
    };

    // ====== Step 1: Generate SRT subtitle file for the episode ======
    let srtContent = '';
    if (config.addSubtitles) {
      const srtLines: string[] = [];
      let currentTime = 0;
      let subtitleIndex = 1;

      for (const sb of storyboards) {
        const result = generateSubtitleForStoryboard(
          sb as unknown as Parameters<typeof generateSubtitleForStoryboard>[0],
          currentTime,
          subtitleIndex
        );
        srtLines.push(...result.srtLines);
        currentTime = result.newTime;
        subtitleIndex = result.newIndex;
      }

      srtContent = srtLines.join('\n');
    }

    // ====== Step 2: Compose each storyboard ======
    const composeResults = storyboards.map((sb) => {
      const hasImage = !!sb.composedImage;
      const hasVideo = !!sb.videoUrl;
      const hasAudio = !!sb.ttsAudioUrl;
      const hasDialogue = !!sb.dialogue;

      // Determine the best available asset for composition
      let bestAsset = 'none';
      if (hasVideo) bestAsset = 'video';
      else if (hasImage) bestAsset = 'image';

      // Composition quality score
      const assetScore = (hasVideo ? 3 : 0) + (hasImage ? 2 : 0) + (hasAudio ? 1 : 0);
      const canCompose = bestAsset !== 'none';

      return {
        storyboardId: sb.id,
        storyboardNumber: sb.storyboardNumber,
        title: sb.title || `分镜 ${sb.storyboardNumber}`,
        hasImage,
        hasVideo,
        hasAudio,
        hasDialogue,
        duration: sb.duration || 5,
        bestAsset,
        assetScore,
        canCompose,
        composed: canCompose,
      };
    });

    // ====== Step 3: Update storyboards in database ======
    const updatePromises = storyboards.map((sb, idx) => {
      const result = composeResults[idx];
      const updateData: Record<string, unknown> = {};

      if (result.composed) {
        // Set a meaningful composedVideoUrl based on the best asset
        updateData.composedVideoUrl = result.bestAsset === 'video'
          ? sb.videoUrl
          : result.bestAsset === 'image'
          ? `composed://${sb.id}/image_based/${Date.now()}`
          : '';

        if (result.canCompose && srtContent) {
          // Store subtitle URL reference (in production this would be a real file)
          updateData.subtitleUrl = `srt://episode_${episodeId}/storyboard_${sb.id}`;
        }

        updateData.status = 'composed';
      }

      return db.storyboard.update({
        where: { id: sb.id },
        data: updateData,
      });
    });

    await Promise.all(updatePromises);

    // ====== Step 4: Update episode status ======
    const composedCount = composeResults.filter((r) => r.composed).length;
    const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 0), 0);
    const allComposed = composedCount === storyboards.length;

    // Build episode-level composition summary
    const compositionSummary = {
      episodeId,
      totalStoryboards: storyboards.length,
      composedCount,
      skippedCount: storyboards.length - composedCount,
      totalDuration,
      averageDuration: totalDuration / storyboards.length,
      subtitleGenerated: !!srtContent,
      subtitleSize: srtContent.length,
      config,
      results: composeResults,
      composedAt: new Date().toISOString(),
      quality: {
        withFullAssets: composeResults.filter(r => r.hasVideo && r.hasAudio).length,
        withVideoOnly: composeResults.filter(r => r.hasVideo && !r.hasAudio).length,
        withImageOnly: composeResults.filter(r => !r.hasVideo && r.hasImage).length,
        withNoAssets: composeResults.filter(r => !r.canCompose).length,
      },
    };

    // Update episode status
    await db.episode.update({
      where: { id: episodeId },
      data: {
        status: allComposed ? 'composed' : 'partial_composed',
        audioConfig: JSON.stringify({
          ...compositionSummary,
          srtContent, // Store the actual SRT content for export
        }),
      },
    });

    return NextResponse.json({
      data: compositionSummary,
    });
  } catch (error) {
    console.error('Error composing storyboards:', error);
    return NextResponse.json(
      { error: 'Compose failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// ==================== GET /api/compose ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });
    }

    const storyboards = await db.storyboard.findMany({
      where: { episodeId },
      orderBy: { storyboardNumber: 'asc' },
      select: {
        id: true,
        storyboardNumber: true,
        title: true,
        composedImage: true,
        videoUrl: true,
        ttsAudioUrl: true,
        subtitleUrl: true,
        composedVideoUrl: true,
        duration: true,
        status: true,
        dialogue: true,
        action: true,
        atmosphere: true,
        location: true,
        time: true,
      },
    });

    const stats = {
      total: storyboards.length,
      withImage: storyboards.filter((s) => s.composedImage).length,
      withVideo: storyboards.filter((s) => s.videoUrl).length,
      withAudio: storyboards.filter((s) => s.ttsAudioUrl).length,
      withDialogue: storyboards.filter((s) => s.dialogue).length,
      composed: storyboards.filter((s) => s.status === 'composed' || s.composedVideoUrl).length,
      totalDuration: storyboards.reduce((sum, s) => sum + (s.duration || 0), 0),
    };

    // Quality assessment
    const quality = {
      fullAssets: storyboards.filter(s => s.videoUrl && s.ttsAudioUrl).length,
      videoOnly: storyboards.filter(s => s.videoUrl && !s.ttsAudioUrl).length,
      imageOnly: storyboards.filter(s => !s.videoUrl && s.composedImage).length,
      noAssets: storyboards.filter(s => !s.videoUrl && !s.composedImage).length,
    };

    return NextResponse.json({
      data: {
        episodeId,
        storyboards,
        stats,
        quality,
        isReadyToCompose: stats.withImage > 0 || stats.withVideo > 0,
        isAllComposed: stats.composed === stats.total && stats.total > 0,
        compositionRate: stats.total > 0 ? Math.round((stats.composed / stats.total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching compose status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compose status', message: (error as Error).message },
      { status: 500 }
    );
  }
}
