import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/episodes/[id] - Get episode detail with characters, scenes, storyboards
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const episode = await db.episode.findUnique({
      where: { id },
      include: {
        drama: {
          select: {
            id: true,
            title: true,
            style: true,
          },
        },
        characters: {
          include: {
            character: true,
          },
        },
        scenes: {
          include: {
            scene: true,
          },
        },
        storyboards: {
          orderBy: { storyboardNumber: 'asc' },
          include: {
            characters: {
              include: {
                character: true,
              },
            },
            scene: true,
          },
        },
      },
    });

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: episode });
  } catch (error) {
    console.error('Error getting episode detail:', error);
    return NextResponse.json(
      { error: 'Failed to get episode', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/episodes/[id] - Update episode content/status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const episode = await db.episode.findUnique({
      where: { id },
    });

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    const updatableFields = [
      'title', 'content', 'scriptContent', 'description',
      'duration', 'status', 'videoUrl', 'imageConfig',
      'videoConfig', 'audioConfig',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (
          (field === 'imageConfig' || field === 'videoConfig' || field === 'audioConfig') &&
          typeof body[field] === 'object'
        ) {
          updateData[field] = JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const updated = await db.episode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating episode:', error);
    return NextResponse.json(
      { error: 'Failed to update episode', message: (error as Error).message },
      { status: 500 }
    );
  }
}
