import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clearProviderCache } from '@/lib/ai-providers';

// GET /api/ai-configs - List all AI service configs (filter by serviceType)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get('serviceType') || undefined;

    const where: Record<string, unknown> = {};
    if (serviceType) {
      where.serviceType = serviceType;
    }

    const configs = await db.aiServiceConfig.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error('Error listing AI configs:', error);
    return NextResponse.json(
      { error: 'Failed to list AI configs', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/ai-configs - Create config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = '',
      serviceType = 'text',
      provider = '',
      apiKey = '',
      baseUrl = '',
      model = '',
      isActive = false,
      priority = 0,
      config = '{}',
    } = body;

    const aiConfig = await db.aiServiceConfig.create({
      data: {
        name,
        serviceType,
        provider,
        apiKey,
        baseUrl,
        model,
        isActive,
        priority,
        config: typeof config === 'string' ? config : JSON.stringify(config),
      },
    });

    clearProviderCache();

    return NextResponse.json({ data: aiConfig }, { status: 201 });
  } catch (error) {
    console.error('Error creating AI config:', error);
    return NextResponse.json(
      { error: 'Failed to create AI config', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/ai-configs/[id] - Update config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.aiServiceConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'AI config not found' },
        { status: 404 }
      );
    }

    const updatableFields = [
      'name', 'serviceType', 'provider', 'apiKey', 'baseUrl',
      'model', 'isActive', 'priority',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.config !== undefined) {
      updateData.config = typeof body.config === 'string'
        ? body.config
        : JSON.stringify(body.config);
    }

    const updated = await db.aiServiceConfig.update({
      where: { id },
      data: updateData,
    });

    clearProviderCache();

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating AI config:', error);
    return NextResponse.json(
      { error: 'Failed to update AI config', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-configs/[id] - Delete config
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.aiServiceConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'AI config not found' },
        { status: 404 }
      );
    }

    await db.aiServiceConfig.delete({
      where: { id },
    });

    clearProviderCache();

    return NextResponse.json({ message: 'AI config deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI config:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI config', message: (error as Error).message },
      { status: 500 }
    );
  }
}
