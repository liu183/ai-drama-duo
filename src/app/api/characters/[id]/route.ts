import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/characters/[id] - Update character
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const character = await db.character.findUnique({
      where: { id },
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    const updatableFields = [
      'name', 'role', 'description', 'appearance', 'personality',
      'voiceStyle', 'imageUrl', 'seedValue', 'sortOrder', 'voiceProvider',
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

    const updated = await db.character.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json(
      { error: 'Failed to update character', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/characters/[id] - Delete character
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const character = await db.character.findUnique({
      where: { id },
    });

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    await db.character.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Character deleted successfully' });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { error: 'Failed to delete character', message: (error as Error).message },
      { status: 500 }
    );
  }
}
