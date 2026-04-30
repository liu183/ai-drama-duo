import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/scenes/[id] - Get a single scene
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scene = await db.scene.findUnique({
      where: { id },
      include: {
        episodes: true,
      },
    });

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    return NextResponse.json({ data: scene });
  } catch (error) {
    console.error('Error fetching scene:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scene', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/scenes/[id] - Update a scene
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const scene = await db.scene.update({
      where: { id },
      data: {
        location: body.location ?? undefined,
        time: body.time ?? undefined,
        prompt: body.prompt ?? undefined,
        imageUrl: body.imageUrl ?? undefined,
        status: body.status ?? undefined,
        storyboardCount: body.storyboardCount ?? undefined,
      },
    });

    return NextResponse.json({ data: scene });
  } catch (error) {
    console.error('Error updating scene:', error);
    return NextResponse.json(
      { error: 'Failed to update scene', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/scenes/[id] - Delete a scene
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.scene.delete({ where: { id } });
    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error('Error deleting scene:', error);
    return NextResponse.json(
      { error: 'Failed to delete scene', message: (error as Error).message },
      { status: 500 }
    );
  }
}
