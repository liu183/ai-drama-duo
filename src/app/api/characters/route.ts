import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/characters?dramaId=xxx - List characters by drama
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

    const characters = await db.character.findMany({
      where: { dramaId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ data: characters });
  } catch (error) {
    console.error('Error listing characters:', error);
    return NextResponse.json(
      { error: 'Failed to list characters', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/characters - Create character
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dramaId,
      name,
      role = 'supporting',
      description = '',
      appearance = '',
      personality = '',
      voiceStyle = '',
      imageUrl = '',
      referenceImages = '[]',
      seedValue = '',
      sortOrder = 0,
      voiceProvider = '',
    } = body;

    if (!dramaId || !name) {
      return NextResponse.json(
        { error: 'dramaId and name are required' },
        { status: 400 }
      );
    }

    const character = await db.character.create({
      data: {
        dramaId,
        name: name.trim(),
        role,
        description,
        appearance,
        personality,
        voiceStyle,
        imageUrl,
        referenceImages: typeof referenceImages === 'string' ? referenceImages : JSON.stringify(referenceImages),
        seedValue,
        sortOrder,
        voiceProvider,
      },
    });

    return NextResponse.json({ data: character }, { status: 201 });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { error: 'Failed to create character', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/characters/batch - Batch upsert characters for a drama
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'batch') {
      const body = await request.json();
      const { dramaId, characters } = body;

      if (!dramaId || !Array.isArray(characters)) {
        return NextResponse.json(
          { error: 'dramaId and characters array are required' },
          { status: 400 }
        );
      }

      const results = await db.$transaction(
        characters.map((char: Record<string, unknown>, index: number) => {
          const data = {
            name: (char.name as string)?.trim(),
            role: (char.role as string) || 'supporting',
            description: (char.description as string) || '',
            appearance: (char.appearance as string) || '',
            personality: (char.personality as string) || '',
            voiceStyle: (char.voiceStyle as string) || '',
            imageUrl: (char.imageUrl as string) || '',
            referenceImages: typeof char.referenceImages === 'string'
              ? char.referenceImages
              : JSON.stringify(char.referenceImages || []),
            seedValue: (char.seedValue as string) || '',
            sortOrder: (char.sortOrder as number) ?? index,
            voiceProvider: (char.voiceProvider as string) || '',
          };

          if (char.id) {
            return db.character.update({
              where: { id: char.id as string, dramaId },
              data,
            });
          } else {
            return db.character.create({
              data: {
                dramaId,
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
    console.error('Error batch upserting characters:', error);
    return NextResponse.json(
      { error: 'Failed to batch upsert characters', message: (error as Error).message },
      { status: 500 }
    );
  }
}
