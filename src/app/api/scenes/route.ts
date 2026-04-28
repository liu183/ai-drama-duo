import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/scenes?dramaId=xxx - List scenes by drama
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dramaId = searchParams.get('dramaId');

    if (!dramaId) {
      return NextResponse.json(
        { error: 'dramaId is required' },
        { status: 400 }
      );
    }

    const scenes = await db.scene.findMany({
      where: { dramaId },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            storyboards: true,
            episodes: true,
          },
        },
      },
    });

    return NextResponse.json({ data: scenes });
  } catch (error) {
    console.error('Error listing scenes:', error);
    return NextResponse.json(
      { error: 'Failed to list scenes', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/scenes - Create scene
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dramaId,
      episodeId,
      location = '',
      time = '',
      prompt = '',
      imageUrl = '',
      status = 'pending',
    } = body;

    if (!dramaId) {
      return NextResponse.json(
        { error: 'dramaId is required' },
        { status: 400 }
      );
    }

    const scene = await db.scene.create({
      data: {
        dramaId,
        episodeId: episodeId || null,
        location,
        time,
        prompt,
        imageUrl,
        status,
      },
    });

    return NextResponse.json({ data: scene }, { status: 201 });
  } catch (error) {
    console.error('Error creating scene:', error);
    return NextResponse.json(
      { error: 'Failed to create scene', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/scenes/batch - Batch upsert scenes for a drama
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'batch') {
      const body = await request.json();
      const { dramaId, scenes } = body;

      if (!dramaId || !Array.isArray(scenes)) {
        return NextResponse.json(
          { error: 'dramaId and scenes array are required' },
          { status: 400 }
        );
      }

      const results = await db.$transaction(
        scenes.map((scene: Record<string, unknown>) => {
          const data = {
            location: (scene.location as string) || '',
            time: (scene.time as string) || '',
            prompt: (scene.prompt as string) || '',
            imageUrl: (scene.imageUrl as string) || '',
            status: (scene.status as string) || 'pending',
          };

          if (scene.id) {
            return db.scene.update({
              where: { id: scene.id as string, dramaId },
              data,
            });
          } else {
            return db.scene.create({
              data: {
                dramaId,
                episodeId: (scene.episodeId as string) || null,
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
    console.error('Error batch upserting scenes:', error);
    return NextResponse.json(
      { error: 'Failed to batch upsert scenes', message: (error as Error).message },
      { status: 500 }
    );
  }
}
