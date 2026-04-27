import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/agent-configs - List all agent configs
export async function GET() {
  try {
    const configs = await db.agentConfig.findMany({
      orderBy: { agentType: 'asc' },
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    console.error('Error listing agent configs:', error);
    return NextResponse.json(
      { error: 'Failed to list agent configs', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/agent-configs - Create agent config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentType,
      systemPrompt = '',
      model = '',
      temperature = 0.7,
      maxTokens = 4096,
      maxSteps = 20,
    } = body;

    if (!agentType) {
      return NextResponse.json(
        { error: 'agentType is required' },
        { status: 400 }
      );
    }

    const config = await db.agentConfig.create({
      data: {
        agentType,
        systemPrompt,
        model,
        temperature,
        maxTokens,
        maxSteps,
      },
    });

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (error) {
    console.error('Error creating agent config:', error);
    return NextResponse.json(
      { error: 'Failed to create agent config', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT /api/agent-configs - Update agent config (by query param id)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id query parameter is required for update' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existing = await db.agentConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Agent config not found' },
        { status: 404 }
      );
    }

    const updatableFields = [
      'systemPrompt', 'model', 'temperature', 'maxTokens', 'maxSteps',
    ] as const;

    const updateData: Record<string, unknown> = {};
    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const updated = await db.agentConfig.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating agent config:', error);
    return NextResponse.json(
      { error: 'Failed to update agent config', message: (error as Error).message },
      { status: 500 }
    );
  }
}
