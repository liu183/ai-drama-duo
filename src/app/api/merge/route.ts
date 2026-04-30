import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/merge - Merge storyboard composed videos into a single episode video
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodeId, storyboardIds, mergeConfig } = body;

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId is required' },
        { status: 400 }
      );
    }

    // Fetch the episode with storyboards
    const episode = await db.episode.findUnique({
      where: { id: episodeId },
      include: {
        storyboards: {
          orderBy: { storyboardNumber: 'asc' },
          where: storyboardIds ? { id: { in: storyboardIds } } : undefined,
        },
      },
    });

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    // Determine which storyboards have composed videos available
    const storyboardsWithVideo = episode.storyboards.filter(
      (sb) => sb.composedVideoUrl || sb.videoUrl
    );

    if (storyboardsWithVideo.length === 0) {
      return NextResponse.json(
        { error: 'No storyboards with video content to merge' },
        { status: 400 }
      );
    }

    // Calculate total duration
    const totalDuration = storyboardsWithVideo.reduce(
      (sum, sb) => sum + (sb.duration || 5),
      0
    );

    // Build merge playlist from available video content
    const mergePlaylist = storyboardsWithVideo.map((sb, idx) => ({
      index: idx,
      storyboardId: sb.id,
      storyboardNumber: sb.storyboardNumber,
      title: sb.title || `分镜 ${sb.storyboardNumber}`,
      videoUrl: sb.composedVideoUrl || sb.videoUrl,
      audioUrl: sb.ttsAudioUrl || null,
      subtitleUrl: sb.subtitleUrl || null,
      duration: sb.duration || 5,
      dialogue: sb.dialogue || '',
    }));

    // Store merge result as videoConfig
    const config = {
      type: 'playlist',
      format: 'sequential',
      storyboards: mergePlaylist,
      totalDuration,
      totalClips: mergePlaylist.length,
      mergeSettings: mergeConfig || {
        transition: 'none',
        crossfadeDuration: 0,
        addIntro: false,
        addOutro: false,
        addBgm: false,
        bgmVolume: 0.3,
      },
      createdAt: new Date().toISOString(),
    };

    // Update the episode with merge info
    const updatedEpisode = await db.episode.update({
      where: { id: episodeId },
      data: {
        videoConfig: JSON.stringify(config),
        duration: totalDuration,
        status: 'merged',
      },
    });

    // Update each storyboard status
    await db.storyboard.updateMany({
      where: {
        id: { in: storyboardsWithVideo.map((sb) => sb.id) },
      },
      data: { status: 'merged' },
    });

    return NextResponse.json({
      data: {
        episodeId,
        totalDuration,
        totalClips: mergePlaylist.length,
        mergedStoryboardIds: storyboardsWithVideo.map((sb) => sb.id),
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

// GET /api/merge?episodeId=xxx - Get merge status for an episode
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId is required' },
        { status: 400 }
      );
    }

    const episode = await db.episode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        title: true,
        status: true,
        duration: true,
        videoUrl: true,
        videoConfig: true,
        audioConfig: true,
      },
    });

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    // Parse videoConfig to get merge info
    let mergeInfo = null;
    if (episode.videoConfig) {
      try {
        mergeInfo = JSON.parse(episode.videoConfig);
      } catch {
        mergeInfo = null;
      }
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
      },
    });

    const mergedCount = storyboards.filter(
      (sb) => sb.status === 'merged' || sb.composedVideoUrl || sb.videoUrl
    ).length;
    const totalCount = storyboards.length;
    const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 0), 0);

    return NextResponse.json({
      data: {
        episode,
        mergeInfo,
        storyboards,
        mergedCount,
        totalCount,
        totalDuration,
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
