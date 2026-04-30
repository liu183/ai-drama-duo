import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/merge - Merge storyboard composed videos into a single episode video
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodeId, storyboardIds, mergeConfig } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });
    }

    // Fetch the episode with storyboards
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
      include: {
        storyboards: {
          orderBy: { storyboardNumber: 'asc' },
          where: storyboardIds ? { id: { in: storyboardIds } } : undefined,
          include: {
            characters: { include: { character: true } },
            scene: true,
          },
        },
        drama: { select: { title: true, genre: true, style: true } },
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    const allStoryboards = episode.storyboards;
    const storyboardsWithContent = allStoryboards.filter(
      (sb) => sb.composedVideoUrl || sb.videoUrl || sb.composedImage
    );

    if (storyboardsWithContent.length === 0) {
      return NextResponse.json(
        { error: 'No storyboards with content to merge. Please complete composition first.' },
        { status: 400 }
      );
    }

    const config = mergeConfig || {
      transition: 'none',
      crossfadeDuration: 0,
      addIntro: false,
      addOutro: false,
      addBgm: false,
      bgmVolume: 0.3,
    };

    // Calculate total duration
    const totalDuration = storyboardsWithContent.reduce(
      (sum, sb) => sum + (sb.duration || 5),
      0
    );

    // Build detailed merge playlist
    const mergePlaylist = storyboardsWithContent.map((sb, idx) => ({
      index: idx,
      storyboardId: sb.id,
      storyboardNumber: sb.storyboardNumber,
      title: sb.title || `分镜 ${sb.storyboardNumber}`,
      scene: sb.scene?.location || '',
      time: sb.scene?.time || '',
      videoSource: sb.composedVideoUrl || sb.videoUrl || '',
      hasImage: !!sb.composedImage,
      hasVideo: !!(sb.videoUrl || sb.composedVideoUrl),
      hasAudio: !!sb.ttsAudioUrl,
      hasSubtitle: !!sb.subtitleUrl,
      hasDialogue: !!sb.dialogue,
      audioUrl: sb.ttsAudioUrl || null,
      subtitleUrl: sb.subtitleUrl || null,
      duration: sb.duration || 5,
      dialogue: sb.dialogue || '',
      characters: sb.characters.map(rc => rc.character.name).filter(Boolean),
      transition: config.transition !== 'none' ? config.transition : (idx < storyboardsWithContent.length - 1 ? 'cut' : 'none'),
    }));

    // Calculate transition overhead
    const transitionCount = config.transition !== 'none'
      ? Math.max(0, storyboardsWithContent.length - 1)
      : 0;
    const transitionOverhead = transitionCount * (config.crossfadeDuration || 0);
    const finalDuration = totalDuration + transitionOverhead;

    // Generate SRT for the merged video
    function formatSRTTime(seconds: number): string {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.floor((seconds % 1) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    const srtLines: string[] = [];
    let currentTime = 0;
    let subtitleIndex = 1;

    for (const sb of storyboardsWithContent) {
      const startTime = currentTime;
      const endTime = currentTime + (sb.duration || 5);

      if (sb.location || sb.time) {
        srtLines.push(`${subtitleIndex}`);
        srtLines.push(`${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}`);
        srtLines.push(`[${sb.location || ''}${sb.location && sb.time ? ' · ' : ''}${sb.time || ''}]`);
        srtLines.push('');
        subtitleIndex++;
      }

      if (sb.dialogue) {
        const charNames = sb.characters.map(c => c.character.name).filter(Boolean);
        const speaker = charNames.length > 0 ? charNames.join(', ') : '';
        srtLines.push(`${subtitleIndex}`);
        srtLines.push(`${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}`);
        srtLines.push(speaker ? `${speaker}: ${sb.dialogue}` : sb.dialogue);
        srtLines.push('');
        subtitleIndex++;
      }

      currentTime = endTime;
    }

    // Build merge result config
    const mergeResult = {
      type: 'playlist',
      format: 'sequential',
      dramaTitle: episode.drama?.title || '',
      episodeTitle: episode.title || '',
      genre: episode.drama?.genre || '',
      style: episode.drama?.style || '',
      storyboards: mergePlaylist,
      totalDuration,
      finalDuration,
      totalClips: mergePlaylist.length,
      transitionConfig: config,
      subtitleContent: srtLines.join('\n'),
      createdAt: new Date().toISOString(),
    };

    // Update the episode
    const updatedEpisode = await db.episode.update({
      where: { id: episodeId },
      data: {
        videoConfig: JSON.stringify(mergeResult),
        duration: finalDuration,
        status: 'merged',
      },
    });

    // Update storyboard statuses
    await db.storyboard.updateMany({
      where: { id: { in: storyboardsWithContent.map(sb => sb.id) } },
      data: { status: 'merged' },
    });

    return NextResponse.json({
      data: {
        episodeId,
        dramaTitle: episode.drama?.title || '',
        episodeTitle: episode.title || '',
        totalDuration: finalDuration,
        totalClips: mergePlaylist.length,
        subtitleCount: subtitleIndex - 1,
        transitionCount,
        mergedStoryboardIds: storyboardsWithContent.map(sb => sb.id),
        mergePlaylist,
        episode: updatedEpisode,
      },
    });
  } catch (error) {
    console.error('Error merging storyboards:', error);
    return NextResponse.json(
      { error: 'Failed to merge storyboards', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/merge?episodeId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });
    }

    const episode = await db.episode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        status: true,
        duration: true,
        videoUrl: true,
        videoConfig: true,
        audioConfig: true,
        scriptContent: true,
      },
    });

    if (!episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    let mergeInfo = null;
    if (episode.videoConfig) {
      try { mergeInfo = JSON.parse(episode.videoConfig); } catch { /* ignore */ }
    }

    const storyboards = await db.storyboard.findMany({
      where: { episodeId },
      orderBy: { storyboardNumber: 'asc' },
      select: {
        id: true,
        storyboardNumber: true,
        title: true,
        composedVideoUrl: true,
        videoUrl: true,
        ttsAudioUrl: true,
        subtitleUrl: true,
        duration: true,
        status: true,
        dialogue: true,
        composedImage: true,
        location: true,
        time: true,
      },
    });

    const mergedCount = storyboards.filter(
      (sb) => sb.status === 'merged' || sb.composedVideoUrl || sb.videoUrl
    ).length;
    const totalCount = storyboards.length;
    const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 0), 0);

    // Asset completeness analysis
    const assetAnalysis = {
      fullAssets: storyboards.filter(s => s.videoUrl && s.ttsAudioUrl).length,
      videoOnly: storyboards.filter(s => s.videoUrl && !s.ttsAudioUrl).length,
      imageOnly: storyboards.filter(s => !s.videoUrl && s.composedImage).length,
      noAssets: storyboards.filter(s => !s.videoUrl && !s.composedImage).length,
      withAudio: storyboards.filter(s => !!s.ttsAudioUrl).length,
      withDialogue: storyboards.filter(s => !!s.dialogue).length,
    };

    return NextResponse.json({
      data: {
        episode,
        mergeInfo,
        storyboards,
        mergedCount,
        totalCount,
        totalDuration,
        assetAnalysis,
        isReadyToMerge: assetAnalysis.fullAssets > 0 || assetAnalysis.videoOnly > 0 || assetAnalysis.imageOnly > 0,
        isComplete: mergedCount === totalCount && totalCount > 0,
      },
    });
  } catch (error) {
    console.error('Error fetching merge status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch merge status', message: (error as Error).message },
      { status: 500 }
    );
  }
}
