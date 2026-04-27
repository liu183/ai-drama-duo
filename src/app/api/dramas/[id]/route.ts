import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dramas/[id] - Get drama detail with episodes, characters, scenes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const drama = await db.drama.findUnique({
      where: { id, deletedAt: null },
      include: {
        episodes: {
          orderBy: { episodeNumber: 'asc' },
          include: {
            _count: {
              select: {
                storyboards: true,
                characters: true,
                scenes: true,
              },
            },
          },
        },
        characters: {
          orderBy: { sortOrder: 'asc' },
        },
        scenes: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            episodes: true,
            characters: true,
            scenes: true,
          },
        },
      },
    });

    if (!drama) {
      return NextResponse.json(
        { error: 'Drama not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: drama });
  } catch (error) {
    console.error('Error getting drama detail:', error);
    return NextResponse.json(
      { error: 'Failed to get drama', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/dramas/[id] - Update drama
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const drama = await db.drama.findUnique({
      where: { id, deletedAt: null },
    });

    if (!drama) {
      return NextResponse.json(
        { error: 'Drama not found' },
        { status: 404 }
      );
    }

    const updatableFields = [
      'title', 'description', 'genre', 'style', 'status',
      'thumbnail', 'tags', 'metadata',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        if (field === 'tags' && !Array.isArray(body[field])) {
          updateData[field] = JSON.stringify(body[field]);
        } else if (field === 'metadata' && typeof body[field] === 'object') {
          updateData[field] = JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // Recalculate total duration from episodes if episodes exist
    if (body.status === 'completed' || body.totalDuration !== undefined) {
      const episodes = await db.episode.findMany({
        where: { dramaId: id },
        select: { duration: true },
      });
      const totalDuration = episodes.reduce((sum, ep) => sum + ep.duration, 0);
      updateData.totalDuration = totalDuration;
    }

    const updated = await db.drama.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating drama:', error);
    return NextResponse.json(
      { error: 'Failed to update drama', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/dramas/[id] - Soft delete drama
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const drama = await db.drama.findUnique({
      where: { id, deletedAt: null },
    });

    if (!drama) {
      return NextResponse.json(
        { error: 'Drama not found' },
        { status: 404 }
      );
    }

    await db.drama.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Drama deleted successfully' });
  } catch (error) {
    console.error('Error deleting drama:', error);
    return NextResponse.json(
      { error: 'Failed to delete drama', message: (error as Error).message },
      { status: 500 }
    );
  }
}
