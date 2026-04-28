import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/storyboards/[id] - Update storyboard
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const storyboard = await db.storyboard.findUnique({
      where: { id },
    });

    if (!storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404 }
      );
    }

    const updatableFields = [
      'storyboardNumber', 'title', 'location', 'time',
      'shotType', 'angle', 'movement', 'action', 'result',
      'atmosphere', 'imagePrompt', 'videoPrompt', 'bgmPrompt',
      'soundEffect', 'dialogue', 'description', 'duration',
      'status', 'sceneId', 'composedImage', 'firstFrameImage',
      'lastFrameImage', 'videoUrl', 'ttsAudioUrl', 'subtitleUrl',
      'composedVideoUrl',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.referenceImages !== undefined) {
      updateData.referenceImages = typeof body.referenceImages === 'string'
        ? body.referenceImages
        : JSON.stringify(body.referenceImages);
    }

    const updated = await db.storyboard.update({
      where: { id },
      data: updateData,
      include: {
        characters: {
          include: {
            character: true,
          },
        },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating storyboard:', error);
    return NextResponse.json(
      { error: 'Failed to update storyboard', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/storyboards/[id] - Delete storyboard
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const storyboard = await db.storyboard.findUnique({
      where: { id },
    });

    if (!storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found' },
        { status: 404 }
      );
    }

    await db.storyboard.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Storyboard deleted successfully' });
  } catch (error) {
    console.error('Error deleting storyboard:', error);
    return NextResponse.json(
      { error: 'Failed to delete storyboard', message: (error as Error).message },
      { status: 500 }
    );
  }
}
