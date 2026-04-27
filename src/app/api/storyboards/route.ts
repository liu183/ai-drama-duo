import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/storyboards?episodeId=xxx - List storyboards by episode
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

    const storyboards = await db.storyboard.findMany({
      where: { episodeId },
      orderBy: { storyboardNumber: 'asc' },
      include: {
        characters: {
          include: {
            character: true,
          },
        },
        scene: true,
      },
    });

    return NextResponse.json({ data: storyboards });
  } catch (error) {
    console.error('Error listing storyboards:', error);
    return NextResponse.json(
      { error: 'Failed to list storyboards', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/storyboards - Create storyboard
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      episodeId,
      sceneId,
      storyboardNumber,
      title = '',
      location = '',
      time = '',
      shotType = '',
      angle = '',
      movement = '',
      action = '',
      result = '',
      atmosphere = '',
      imagePrompt = '',
      videoPrompt = '',
      bgmPrompt = '',
      soundEffect = '',
      dialogue = '',
      description = '',
      duration = 10,
      status = 'pending',
      characterIds = [],
    } = body;

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId is required' },
        { status: 400 }
      );
    }

    const storyboard = await db.storyboard.create({
      data: {
        episodeId,
        sceneId: sceneId || null,
        storyboardNumber,
        title,
        location,
        time,
        shotType,
        angle,
        movement,
        action,
        result,
        atmosphere,
        imagePrompt,
        videoPrompt,
        bgmPrompt,
        soundEffect,
        dialogue,
        description,
        duration,
        status,
        characters: characterIds.length > 0
          ? {
              create: characterIds.map((characterId: string) => ({
                characterId,
              })),
            }
          : undefined,
      },
      include: {
        characters: {
          include: {
            character: true,
          },
        },
      },
    });

    return NextResponse.json({ data: storyboard }, { status: 201 });
  } catch (error) {
    console.error('Error creating storyboard:', error);
    return NextResponse.json(
      { error: 'Failed to create storyboard', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/storyboards/batch - Batch upsert storyboards for an episode
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'batch') {
      const body = await request.json();
      const { episodeId, storyboards } = body;

      if (!episodeId || !Array.isArray(storyboards)) {
        return NextResponse.json(
          { error: 'episodeId and storyboards array are required' },
          { status: 400 }
        );
      }

      const results = await db.$transaction(
        storyboards.map((sb: Record<string, unknown>) => {
          const data = {
            title: (sb.title as string) || '',
            location: (sb.location as string) || '',
            time: (sb.time as string) || '',
            shotType: (sb.shotType as string) || '',
            angle: (sb.angle as string) || '',
            movement: (sb.movement as string) || '',
            action: (sb.action as string) || '',
            result: (sb.result as string) || '',
            atmosphere: (sb.atmosphere as string) || '',
            imagePrompt: (sb.imagePrompt as string) || '',
            videoPrompt: (sb.videoPrompt as string) || '',
            bgmPrompt: (sb.bgmPrompt as string) || '',
            soundEffect: (sb.soundEffect as string) || '',
            dialogue: (sb.dialogue as string) || '',
            description: (sb.description as string) || '',
            duration: (sb.duration as number) ?? 10,
            status: (sb.status as string) || 'pending',
            sceneId: (sb.sceneId as string) || null,
            composedImage: (sb.composedImage as string) || '',
            firstFrameImage: (sb.firstFrameImage as string) || '',
            lastFrameImage: (sb.lastFrameImage as string) || '',
            referenceImages: typeof sb.referenceImages === 'string'
              ? sb.referenceImages
              : JSON.stringify(sb.referenceImages || []),
            videoUrl: (sb.videoUrl as string) || '',
            ttsAudioUrl: (sb.ttsAudioUrl as string) || '',
            subtitleUrl: (sb.subtitleUrl as string) || '',
            composedVideoUrl: (sb.composedVideoUrl as string) || '',
          };

          if (sb.id) {
            return db.storyboard.update({
              where: { id: sb.id as string, episodeId },
              data,
            });
          } else {
            return db.storyboard.create({
              data: {
                episodeId,
                storyboardNumber: (sb.storyboardNumber as number) ?? 0,
                ...data,
              },
            });
          }
        })
      );

      return NextResponse.json({ data: results });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use ?action=batch for batch upsert.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error batch upserting storyboards:', error);
    return NextResponse.json(
      { error: 'Failed to batch upsert storyboards', message: (error as Error).message },
      { status: 500 }
    );
  }
}
