import { NextRequest, NextResponse } from 'next/server';
import {
  testTextConnection,
  testImageConnection,
  testAudioConnection,
  type ProviderConfig,
  type ServiceType,
} from '@/lib/ai-providers';

// POST /api/ai-configs/test - Test AI service connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, serviceType, provider, apiKey, baseUrl, model } = body;

    // If id is provided, test an existing saved config
    if (id) {
      const { db } = await import('@/lib/db');
      const config = await db.aiServiceConfig.findUnique({ where: { id } });

      if (!config) {
        return NextResponse.json(
          { success: false, message: '配置不存在' },
          { status: 404 }
        );
      }

      const providerConfig: ProviderConfig = {
        id: config.id,
        name: config.name,
        serviceType: config.serviceType as ServiceType,
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        isActive: config.isActive,
        priority: config.priority,
        config: parseJsonConfig(config.config),
      };

      const result = await testConnectionByType(providerConfig);
      return NextResponse.json({ data: result });
    }

    // Test with temporary config from form
    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Base URL 和 API Key 不能为空' },
        { status: 400 }
      );
    }

    const tempConfig: ProviderConfig = {
      id: 'temp',
      name: '临时测试',
      serviceType: (serviceType || 'text') as ServiceType,
      provider: provider || 'custom',
      apiKey,
      baseUrl,
      model: model || '',
      isActive: true,
      priority: 0,
      config: {},
    };

    const result = await testConnectionByType(tempConfig);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `测试失败: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

async function testConnectionByType(config: ProviderConfig): Promise<{ success: boolean; message: string; latency?: number }> {
  switch (config.serviceType) {
    case 'text':
      return testTextConnection(config);
    case 'image':
      return testImageConnection(config);
    case 'audio':
      return testAudioConnection(config);
    case 'video':
      // Video providers typically don't have a lightweight test endpoint
      // Just test if the server is reachable
      return testImageConnection(config).catch(() => ({
        success: false,
        message: '无法连接到视频服务',
      }));
    default:
      return testTextConnection(config);
  }
}

function parseJsonConfig(raw: string): Record<string, unknown> {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
