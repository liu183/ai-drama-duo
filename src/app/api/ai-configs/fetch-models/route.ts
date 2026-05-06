import { NextRequest, NextResponse } from 'next/server';

// POST /api/ai-configs/fetch-models - 从供应商API动态拉取模型列表
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseUrl, apiKey, provider, serviceType } = body;

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { success: false, message: 'Base URL 和 API Key 不能为空', models: [] },
        { status: 400 }
      );
    }

    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 认证方式
    let authType = 'bearer';
    let apiFormat = 'openai';

    // 从预设获取认证方式
    try {
      const { getProviderPreset } = await import('@/lib/provider-presets');
      const preset = getProviderPreset(provider);
      if (preset) {
        authType = preset.authType || 'bearer';
        apiFormat = preset.apiFormat || 'openai';
      }
    } catch {
      // ignore
    }

    if (authType === 'x-api-key') {
      headers['x-api-key'] = apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Anthropic 不支持 /models 端点，返回预设模型列表
    if (apiFormat === 'anthropic') {
      const { getProviderPreset } = await import('@/lib/provider-presets');
      const preset = getProviderPreset(provider);
      const models = (preset?.models || [])
        .filter((m) => !serviceType || m.type === serviceType)
        .map((m) => ({ id: m.modelId, label: m.label, description: m.description || '' }));

      return NextResponse.json({
        success: true,
        message: `已加载 ${preset?.name || provider} 预设模型列表`,
        models,
        source: 'preset',
      });
    }

    // 尝试调用 /models 端点
    const modelsResp = await fetch(`${cleanUrl}/models`, {
      method: 'GET',
      headers,
    });

    if (modelsResp.ok) {
      const data = await modelsResp.json();
      let rawModels: Array<{ id: string; owned_by?: string; object?: string }> = [];

      // OpenAI 格式: { data: [...] }
      if (Array.isArray(data?.data)) {
        rawModels = data.data;
      } else if (Array.isArray(data?.models)) {
        rawModels = data.models;
      } else if (Array.isArray(data)) {
        rawModels = data;
      }

      // 过滤和分类模型
      const filteredModels = rawModels
        .filter((m) => {
          const id = (m.id || '').toLowerCase();
          // 过滤掉 embedding 模型、rerank 模型等非生成模型
          if (id.includes('embedding') || id.includes('rerank') || id.includes('tts') && serviceType === 'text') return false;
          if (id.includes('whisper') || id.includes('transcription') || id.includes('speech-to-text')) return false;
          if (id.includes('dall-e') || id.includes('image') || id.includes('flux') || id.includes('stable-diffusion')) {
            // 图片模型只在 image 类型时显示
            if (serviceType && serviceType !== 'image') return false;
          }
          if (id.includes('video') || id.includes('runway') || id.includes('kling')) {
            if (serviceType && serviceType !== 'video') return false;
          }
          if (id.includes('tts') || id.includes('speech') || id.includes('cosyvoice') || id.includes('sambert')) {
            if (serviceType && serviceType !== 'audio') return false;
          }
          return true;
        })
        .map((m) => ({
          id: m.id,
          label: m.id,
          description: m.owned_by || '',
        }));

      if (filteredModels.length > 0) {
        return NextResponse.json({
          success: true,
          message: `成功拉取 ${filteredModels.length} 个模型`,
          models: filteredModels,
          source: 'api',
        });
      }

      // 如果过滤后为空，返回全部
      const allModels = rawModels.map((m) => ({
        id: m.id,
        label: m.id,
        description: m.owned_by || '',
      }));

      if (allModels.length > 0) {
        return NextResponse.json({
          success: true,
          message: `成功拉取 ${allModels.length} 个模型`,
          models: allModels,
          source: 'api',
        });
      }
    }

    // /models 端点不可用时，回退到预设模型列表
    const { getProviderPreset } = await import('@/lib/provider-presets');
    const preset = getProviderPreset(provider);
    const presetModels = (preset?.models || [])
      .filter((m) => !serviceType || m.type === serviceType)
      .map((m) => ({ id: m.modelId, label: m.label, description: m.description || '' }));

    if (presetModels.length > 0) {
      return NextResponse.json({
        success: true,
        message: `API不支持模型列表查询，已加载 ${preset?.name || provider} 预设模型`,
        models: presetModels,
        source: 'preset',
      });
    }

    return NextResponse.json({
      success: false,
      message: '无法获取模型列表，请手动输入模型名称',
      models: [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: `获取模型列表失败: ${(error as Error).message}`, models: [] },
      { status: 500 }
    );
  }
}
