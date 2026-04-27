import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/dramas - List all dramas with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') || undefined;
    const keyword = searchParams.get('keyword') || undefined;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
        { genre: { contains: keyword } },
      ];
    }

    const [dramas, total] = await Promise.all([
      db.drama.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              episodes: true,
              characters: true,
            },
          },
        },
      }),
      db.drama.count({ where }),
    ]);

    return NextResponse.json({
      data: dramas,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error listing dramas:', error);
    return NextResponse.json(
      { error: 'Failed to list dramas', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/dramas - Create a new drama (auto-create episodes)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description = '',
      genre = '',
      style = 'realistic',
      totalEpisodes = 10,
      thumbnail = '',
      tags = '[]',
      metadata = '{}',
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const drama = await db.drama.create({
      data: {
        title: title.trim(),
        description,
        genre,
        style,
        totalEpisodes,
        thumbnail,
        tags: typeof tags === 'string' ? tags : JSON.stringify(tags),
        metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
        episodes: {
          create: Array.from({ length: totalEpisodes }, (_, i) => ({
            episodeNumber: i + 1,
            title: `第${i + 1}集`,
          })),
        },
      },
      include: {
        episodes: {
          orderBy: { episodeNumber: 'asc' },
        },
      },
    });

    return NextResponse.json({ data: drama }, { status: 201 });
  } catch (error) {
    console.error('Error creating drama:', error);
    return NextResponse.json(
      { error: 'Failed to create drama', message: (error as Error).message },
      { status: 500 }
    );
  }
}
