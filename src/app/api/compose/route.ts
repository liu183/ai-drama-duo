import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/compose - Compose storyboard assets into a final video segment
// This simulates composition by collecting all available assets and marking status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodeId, storyboardIds, composeConfig } = body;

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId is required' }, { status: 400 });
    }

    // Fetch storyboards to compose
    const storyboards = await db.storyboard.findMany({
      where: {
        episodeId,
        ...(storyboardIds ? { id: { in: storyboardIds } } : {}),
      },
      orderBy: { storyboardNumber: 'asc' },
    });

    if (storyboards.length === 0) {
      return NextResponse.json({ error: 'No storyboards to compose' }, { status: 400 });
    }

    // Process each storyboard - mark composed with available assets
    const composeResults = storyboards.map((sb) => {
      const hasImage = !!sb.composedImage;
      const hasVideo = !!sb.videoUrl;
      const hasAudio = !!sb.ttsAudioUrl;

      // Generate composed video URL placeholder
      // In production, this would call ffmpeg or external service
      const composedUrl = hasVideo
        ? `composed://${sb.id}/${Date.now()}`
        : hasImage
        ? `composed://image_${sb.id}/${Date.now()}`
        : '';

      return {
        storyboardId: sb.id,
        storyboardNumber: sb.storyboardNumber,
        title: sb.title || `分镜 ${sb.storyboardNumber}`,
        hasImage,
        hasVideo,
        hasAudio,
        hasDialogue: !!sb.dialogue,
        duration: sb.duration || 5,
        composed: !!composedUrl,
        composedVideoUrl: composedUrl,
      };
    });

    // Update storyboards with composed URLs
    const updatePromises = composeResults
      .filter((r) => r.composed)
      .map((r) =>
        db.storyboard.update({
          where: { id: r.storyboardId },
          data: {
            composedVideoUrl: r.composedVideoUrl,
            status: 'composed',
          },
        })
      );

    await Promise.all(updatePromises);

    const composedCount = composeResults.filter((r) => r.composed).length;
    const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 0), 0);

    return NextResponse.json({
      data: {
        episodeId,
        totalStoryboards: storyboards.length,
        composedCount,
        totalDuration,
        results: composeResults,
        config: composeConfig || {
          resolution: '1920x1080',
          fps: 30,
          addSubtitles: true,
          subtitleStyle: 'default',
          audioMix: true,
          audioVolume: { dialogue: 1.0, bgm: 0.3, sfx: 0.5 },
        },
      },
    });
  } catch (error) {
    console.error('Error composing storyboards:', error);
    return NextResponse.json(
      { error: 'Compose failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/compose?episodeId=xxx - Get composition status
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
      },
    });

    const stats = {
      total: storyboards.length,
      withImage: storyboards.filter((s) => s.composedImage).length,
      withVideo: storyboards.filter((s) => s.videoUrl).length,
      withAudio: storyboards.filter((s) => s.ttsAudioUrl).length,
      composed: storyboards.filter((s) => s.composedVideoUrl).length,
      totalDuration: storyboards.reduce((sum, s) => sum + (s.duration || 0), 0),
    };

    return NextResponse.json({
      data: {
        episodeId,
        storyboards,
        stats,
        isReadyToCompose: stats.withImage > 0 || stats.withVideo > 0,
        isAllComposed: stats.composed === stats.total && stats.total > 0,
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
