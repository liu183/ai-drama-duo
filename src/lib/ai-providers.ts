/**
 * 统一 AI 供应商调用层
 * 从数据库 AiServiceConfig 读取配置，支持多供应商 fallback 链
 * 兼容 Z.ai 平台 SDK + OpenAI 兼容接口 + Anthropic 接口 + 自定义 API
 */

import { db } from './db';

// ==================== 类型定义 ====================

export type ServiceType = 'text' | 'image' | 'video' | 'audio';

export interface ProviderConfig {
  id: string;
  name: string;
  serviceType: ServiceType;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  priority: number;
  config: Record<string, unknown>;
  /** 供应商预设的 authType，如 'bearer' | 'x-api-key' */
  authType?: string;
  /** 供应商预设的 apiFormat，如 'openai' | 'anthropic' */
  apiFormat?: string;
}

// ==================== 配置读取 ====================

// 内存缓存，避免每次请求都查数据库
let configCache: Map<ServiceType, ProviderConfig[]> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30秒缓存

/**
 * 从数据库获取指定类型的活跃供应商配置，按优先级排序
 */
export async function getActiveProviders(serviceType: ServiceType): Promise<ProviderConfig[]> {
  const now = Date.now();

  // 使用缓存
  if (configCache && (now - cacheTimestamp) < CACHE_TTL) {
    const cached = configCache.get(serviceType);
    if (cached) return cached;
  }

  // 从数据库读取
  const configs = await db.aiServiceConfig.findMany({
    where: {
      serviceType,
      isActive: true,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  });

  // 查找预设信息以补充 authType 和 apiFormat
  const { getProviderPreset } = await import('./provider-presets');

  const parsed: ProviderConfig[] = configs.map(c => {
    const preset = getProviderPreset(c.provider);
    return {
      id: c.id,
      name: c.name,
      serviceType: c.serviceType as ServiceType,
      provider: c.provider,
      apiKey: c.apiKey,
      baseUrl: c.baseUrl,
      model: c.model,
      isActive: c.isActive,
      priority: c.priority,
      config: parseJsonConfig(c.config),
      authType: preset?.authType,
      apiFormat: preset?.apiFormat,
    };
  });

  // 更新缓存
  if (!configCache) configCache = new Map();
  configCache.set(serviceType, parsed);
  cacheTimestamp = now;

  return parsed;
}

/**
 * 清除配置缓存（配置变更时调用）
 */
export function clearProviderCache(): void {
  configCache = null;
  cacheTimestamp = 0;
}

function parseJsonConfig(raw: string): Record<string, unknown> {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ==================== Z.ai 平台 SDK 检测 ====================

let ZAI: typeof import('z-ai-web-dev-sdk').default | null = null;
let zaiChecked = false;

async function getZAI() {
  if (zaiChecked) return ZAI;
  zaiChecked = true;
  try {
    if (!process.env.VERCEL) {
      ZAI = (await import('z-ai-web-dev-sdk')).default;
    }
  } catch {
    // SDK not available
  }
  return ZAI;
}

const isZAIPlatform = !process.env.VERCEL && !!ZAI;

// ==================== 文本生成 (Chat Completions) ====================

export interface TextGenOptions {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;           // 指定模型，可选
  preferProvider?: string;  // 优先使用的供应商 provider ID
}

export interface TextGenResult {
  content: string;
  provider: string;
  model: string;
}

/**
 * 统一文本生成接口
 * 优先级：指定供应商 > DB活跃配置(按priority) > Z.ai SDK > NVIDIA环境变量
 */
export async function generateText(options: TextGenOptions): Promise<TextGenResult> {
  const { systemPrompt, userMessage, temperature = 0.7, maxTokens = 4096, model, preferProvider } = options;

  // 1. Z.ai 平台（本地开发环境优先）
  const sdk = await getZAI();
  if (!process.env.VERCEL && sdk) {
    try {
      const zai = await sdk.create();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      });
      const content = completion.choices?.[0]?.message?.content || '';
      if (content) {
        return { content, provider: 'z-ai-sdk', model: 'z-ai-default' };
      }
    } catch (error) {
      console.warn('[AI] Z.ai SDK call failed, falling back:', (error as Error).message);
    }
  }

  // 2. 从数据库读取活跃供应商配置
  const providers = await getActiveProviders('text');

  // 排序：优先使用指定供应商
  let sortedProviders = providers;
  if (preferProvider) {
    const preferred = providers.filter(p => p.provider === preferProvider);
    const others = providers.filter(p => p.provider !== preferProvider);
    sortedProviders = [...preferred, ...others];
  }

  // 3. 按优先级逐个尝试
  for (const provider of sortedProviders) {
    try {
      let content: string;

      // 检查是否是 Anthropic 格式
      if (provider.apiFormat === 'anthropic' || provider.provider === 'anthropic') {
        content = await callAnthropicAPI(provider, systemPrompt, userMessage, {
          temperature,
          maxTokens,
          model: model || provider.model,
        });
      } else {
        content = await callOpenAICompatible(
          provider,
          systemPrompt,
          userMessage,
          { temperature, maxTokens, model: model || provider.model }
        );
      }

      return { content, provider: provider.provider, model: model || provider.model };
    } catch (error) {
      console.warn(`[AI] Provider "${provider.name}" (${provider.provider}) failed:`, (error as Error).message);
    }
  }

  // 4. 回退到 NVIDIA 环境变量
  const nvidiaBaseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');
  const nvidiaApiKey = process.env.NVIDIA_API_KEY || '';
  if (nvidiaBaseUrl && nvidiaApiKey) {
    const nvidiaModel = model || process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct';
    const result = await callOpenAICompatibleRaw(
      nvidiaBaseUrl, nvidiaApiKey, nvidiaModel,
      systemPrompt, userMessage,
      { temperature, maxTokens }
    );
    return { content: result, provider: 'nvidia-env', model: nvidiaModel };
  }

  throw new Error('所有文本生成供应商均不可用，请在设置页面配置 AI 服务');
}

/**
 * Anthropic Messages API 调用
 * Anthropic 使用不同的 API 格式：POST /v1/messages + x-api-key 头
 */
async function callAnthropicAPI(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  options: { temperature: number; maxTokens: number; model: string }
): Promise<string> {
  const baseUrl = provider.baseUrl.replace(/\/+$/, '');
  const model = options.model;

  // Anthropic API 需要 anthropic-version 头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };

  // 认证头：x-api-key 或 Bearer
  if (provider.authType === 'x-api-key') {
    headers['x-api-key'] = provider.apiKey;
  } else {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // Anthropic 返回格式：{ content: [{ type: 'text', text: '...' }] }
  const textBlocks = data.content?.filter(
    (block: { type: string }) => block.type === 'text'
  );
  if (textBlocks && textBlocks.length > 0) {
    return textBlocks.map((block: { text: string }) => block.text).join('');
  }

  throw new Error('No content in Anthropic response');
}

/**
 * OpenAI 兼容接口调用（使用 ProviderConfig）
 */
async function callOpenAICompatible(
  provider: ProviderConfig,
  systemPrompt: string,
  userMessage: string,
  options: { temperature: number; maxTokens: number; model: string }
): Promise<string> {
  return callOpenAICompatibleRaw(
    provider.baseUrl,
    provider.apiKey,
    options.model,
    systemPrompt,
    userMessage,
    options
  );
}

/**
 * OpenAI 兼容接口原始调用
 */
async function callOpenAICompatibleRaw(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  options: { temperature: number; maxTokens: number }
): Promise<string> {
  if (!baseUrl || !apiKey) {
    throw new Error('Missing baseUrl or apiKey');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ==================== 图片生成 ====================

export interface ImageGenOptions {
  prompt: string;
  size?: string;            // e.g., '1024x1024'
  model?: string;
  preferProvider?: string;
  negativePrompt?: string;
  referenceImage?: string;
}

export interface ImageGenResult {
  base64: string;
  provider: string;
  model: string;
}

/**
 * 统一图片生成接口
 */
export async function generateImage(options: ImageGenOptions): Promise<ImageGenResult> {
  const { prompt, size = '1024x1024', model, preferProvider, negativePrompt, referenceImage } = options;

  // 1. Z.ai 平台
  const sdk = await getZAI();
  if (!process.env.VERCEL && sdk) {
    try {
      const zai = await sdk.create();
      const response = await zai.images.generations.create({
        prompt,
        size: size as '1024x1024',
      });
      let base64 = response.data?.[0]?.base64 || null;
      if (base64 && !base64.startsWith('data:')) {
        base64 = `data:image/png;base64,${base64}`;
      }
      if (base64) {
        return { base64, provider: 'z-ai-sdk', model: 'z-ai-default' };
      }
    } catch (error) {
      console.warn('[ImageGen] Z.ai SDK failed, falling back:', (error as Error).message);
    }
  }

  // 2. DB 配置
  const providers = await getActiveProviders('image');
  let sortedProviders = providers;
  if (preferProvider) {
    const preferred = providers.filter(p => p.provider === preferProvider);
    const others = providers.filter(p => p.provider !== preferProvider);
    sortedProviders = [...preferred, ...others];
  }

  for (const provider of sortedProviders) {
    try {
      const result = await callImageProvider(provider, prompt, size, { model: model || provider.model, negativePrompt, referenceImage });
      return { base64: result, provider: provider.provider, model: model || provider.model };
    } catch (error) {
      console.warn(`[ImageGen] Provider "${provider.name}" failed:`, (error as Error).message);
    }
  }

  // 3. NVIDIA 环境变量回退
  const nvidiaBaseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');
  const nvidiaApiKey = process.env.NVIDIA_API_KEY || '';
  if (nvidiaBaseUrl && nvidiaApiKey) {
    const nvidiaModel = model || 'black-forest-labs/flux-schnell';
    const [w, h] = size.split('x').map(Number);
    const response = await fetch(`${nvidiaBaseUrl}/image/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaApiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: nvidiaModel,
        width: w || 1024,
        height: h || 1024,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const imgItem = (data?.data?.[0] || data?.images?.[0]) as Record<string, string> | undefined;
      if (imgItem) {
        let base64 = '';
        if (typeof imgItem.b64_json === 'string') {
          base64 = `data:image/png;base64,${imgItem.b64_json}`;
        } else if (typeof imgItem.base64 === 'string') {
          base64 = imgItem.base64.startsWith('data:') ? imgItem.base64 : `data:image/png;base64,${imgItem.base64}`;
        } else if (typeof imgItem.url === 'string' && imgItem.url.startsWith('http')) {
          const imgResp = await fetch(imgItem.url);
          const buffer = await imgResp.arrayBuffer();
          base64 = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
        }
        if (base64) return { base64, provider: 'nvidia-env', model: nvidiaModel };
      }
    }
  }

  throw new Error('所有图片生成供应商均不可用，请在设置页面配置图片生成服务');
}

/**
 * 调用图片生成供应商
 */
async function callImageProvider(
  provider: ProviderConfig,
  prompt: string,
  size: string,
  options: { model: string; negativePrompt?: string; referenceImage?: string }
): Promise<string> {
  const baseUrl = provider.baseUrl.replace(/\/+$/, '');
  const model = options.model;

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (provider.authType === 'x-api-key') {
    headers['x-api-key'] = provider.apiKey;
  } else {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  // 大多数图片生成使用 OpenAI /images/generations 兼容接口
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      model,
      size,
      n: 1,
      ...(options.negativePrompt ? { negative_prompt: options.negativePrompt } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Image API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const imgItem = (data?.data?.[0] || data?.images?.[0]) as Record<string, string> | undefined;

  if (!imgItem) throw new Error('No image data in response');

  if (typeof imgItem.b64_json === 'string') {
    return `data:image/png;base64,${imgItem.b64_json}`;
  }
  if (typeof imgItem.base64 === 'string') {
    return imgItem.base64.startsWith('data:') ? imgItem.base64 : `data:image/png;base64,${imgItem.base64}`;
  }
  if (typeof imgItem.url === 'string' && imgItem.url.startsWith('http')) {
    const imgResp = await fetch(imgItem.url);
    const buffer = await imgResp.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
  }

  throw new Error('No usable image data in response');
}

// ==================== TTS 语音合成 ====================

export interface TTSOptions {
  text: string;
  voice?: string;
  language?: string;
  model?: string;
  preferProvider?: string;
}

export interface TTSResult {
  base64: string;
  provider: string;
  model: string;
  contentType: string;
}

/**
 * 统一 TTS 语音合成接口
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
  const { text, voice = 'default', language = 'zh', model, preferProvider } = options;

  // 从 DB 读取配置
  const providers = await getActiveProviders('audio');
  let sortedProviders = providers;
  if (preferProvider) {
    const preferred = providers.filter(p => p.provider === preferProvider);
    const others = providers.filter(p => p.provider !== preferProvider);
    sortedProviders = [...preferred, ...others];
  }

  for (const provider of sortedProviders) {
    try {
      const result = await callTTSProvider(provider, text, voice, language, model || provider.model);
      return result;
    } catch (error) {
      console.warn(`[TTS] Provider "${provider.name}" failed:`, (error as Error).message);
    }
  }

  // NVIDIA 环境变量回退
  const nvidiaBaseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');
  const nvidiaApiKey = process.env.NVIDIA_API_KEY || '';
  if (nvidiaBaseUrl && nvidiaApiKey) {
    const response = await fetch(`${nvidiaBaseUrl}/audio/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaApiKey}`,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({ text, voice, language }),
    });
    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'audio/mpeg';
      const buffer = await response.arrayBuffer();
      return {
        base64: `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`,
        provider: 'nvidia-env',
        model: 'default',
        contentType,
      };
    }
  }

  throw new Error('所有 TTS 供应商均不可用，请在设置页面配置语音合成服务');
}

/**
 * 调用 TTS 供应商
 */
async function callTTSProvider(
  provider: ProviderConfig,
  text: string,
  voice: string,
  language: string,
  model: string
): Promise<TTSResult> {
  const baseUrl = provider.baseUrl.replace(/\/+$/, '');

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (provider.authType === 'x-api-key') {
    headers['x-api-key'] = provider.apiKey;
  } else {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  // OpenAI 兼容 TTS 接口
  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input: text,
      voice,
    }),
  });

  if (!response.ok) {
    // 尝试 /audio/tts 端点（部分供应商用这个）
    const response2 = await fetch(`${baseUrl}/audio/tts`, {
      method: 'POST',
      headers: {
        ...headers,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({ text, voice, language }),
    });
    if (!response2.ok) {
      throw new Error(`TTS API error: ${response.status} / ${response2.status}`);
    }
    const contentType = response2.headers.get('content-type') || 'audio/mpeg';
    const buffer = await response2.arrayBuffer();
    return {
      base64: `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`,
      provider: provider.provider,
      model,
      contentType,
    };
  }

  const contentType = response.headers.get('content-type') || 'audio/mpeg';
  const buffer = await response.arrayBuffer();
  return {
    base64: `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`,
    provider: provider.provider,
    model,
    contentType,
  };
}

// ==================== 视频生成 ====================

export interface VideoGenOptions {
  prompt: string;
  model?: string;
  preferProvider?: string;
  referenceImage?: string;
  motionScale?: number;
  cameraSpeed?: string;
  duration?: number;
}

export interface VideoGenResult {
  base64?: string;
  videoUrl?: string;
  taskId?: string;
  provider: string;
  model: string;
  status: 'completed' | 'pending';
}

/**
 * 统一视频生成接口
 */
export async function generateVideo(options: VideoGenOptions): Promise<VideoGenResult> {
  const { prompt, model, preferProvider, referenceImage, motionScale, cameraSpeed, duration } = options;

  // 从 DB 读取配置
  const providers = await getActiveProviders('video');
  let sortedProviders = providers;
  if (preferProvider) {
    const preferred = providers.filter(p => p.provider === preferProvider);
    const others = providers.filter(p => p.provider !== preferProvider);
    sortedProviders = [...preferred, ...others];
  }

  for (const provider of sortedProviders) {
    try {
      const result = await callVideoProvider(provider, prompt, {
        model: model || provider.model,
        referenceImage,
        motionScale,
        cameraSpeed,
        duration,
      });
      return { ...result, provider: provider.provider, model: model || provider.model };
    } catch (error) {
      console.warn(`[VideoGen] Provider "${provider.name}" failed:`, (error as Error).message);
    }
  }

  // NVIDIA 环境变量回退
  const nvidiaBaseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');
  const nvidiaApiKey = process.env.NVIDIA_API_KEY || '';
  if (nvidiaBaseUrl && nvidiaApiKey) {
    const requestBody: Record<string, unknown> = { prompt };
    if (referenceImage?.startsWith('data:')) requestBody.image = referenceImage;
    const response = await fetch(`${nvidiaBaseUrl}/video/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${nvidiaApiKey}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    if (response.ok) {
      const data = await response.json();
      const videoData = data.video || data.output?.[0];
      if (videoData) {
        let base64 = '';
        if (typeof videoData === 'string' && videoData.startsWith('data:')) {
          base64 = videoData;
        } else if (typeof videoData === 'string' && videoData.startsWith('http')) {
          const resp = await fetch(videoData);
          base64 = `data:video/mp4;base64,${Buffer.from(await resp.arrayBuffer()).toString('base64')}`;
        }
        if (base64) return { base64, provider: 'nvidia-env', model: 'default', status: 'completed' };
      }
      if (data.task_id || data.id) {
        return { taskId: data.task_id || data.id, provider: 'nvidia-env', model: 'default', status: 'pending' };
      }
    }
  }

  throw new Error('所有视频生成供应商均不可用，请在设置页面配置视频生成服务');
}

/**
 * 调用视频生成供应商
 */
async function callVideoProvider(
  provider: ProviderConfig,
  prompt: string,
  options: { model: string; referenceImage?: string; motionScale?: number; cameraSpeed?: string; duration?: number }
): Promise<Omit<VideoGenResult, 'provider' | 'model'>> {
  const baseUrl = provider.baseUrl.replace(/\/+$/, '');

  // 构建请求头
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (provider.authType === 'x-api-key') {
    headers['x-api-key'] = provider.apiKey;
  } else {
    headers['Authorization'] = `Bearer ${provider.apiKey}`;
  }

  const requestBody: Record<string, unknown> = {
    prompt,
    model: options.model,
  };

  if (options.referenceImage?.startsWith('data:')) {
    requestBody.image = options.referenceImage;
  }
  if (options.motionScale) requestBody.motion_scale = options.motionScale;
  if (options.duration) requestBody.duration = options.duration;

  const response = await fetch(`${baseUrl}/video/generations`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Video API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();

  // 同步返回
  const videoData = data.video || data.output?.[0] || data.data?.[0];
  if (videoData) {
    if (typeof videoData === 'string' && videoData.startsWith('data:')) {
      return { base64: videoData, status: 'completed' };
    }
    if (typeof videoData === 'string' && videoData.startsWith('http')) {
      const resp = await fetch(videoData);
      const base64 = `data:video/mp4;base64,${Buffer.from(await resp.arrayBuffer()).toString('base64')}`;
      return { base64, status: 'completed' };
    }
  }

  // 异步任务
  if (data.task_id || data.id) {
    return { taskId: data.task_id || data.id, status: 'pending' };
  }

  throw new Error('No video data in response');
}

// ==================== 连接测试 ====================

export interface TestConnectionResult {
  success: boolean;
  message: string;
  latency?: number;
}

/**
 * 测试文本供应商连接
 */
export async function testTextConnection(provider: ProviderConfig): Promise<TestConnectionResult> {
  const start = Date.now();
  try {
    // Anthropic 格式
    if (provider.apiFormat === 'anthropic' || provider.provider === 'anthropic') {
      const content = await callAnthropicAPI(
        provider,
        'You are a test assistant. Reply with exactly: OK',
        'Hi',
        { temperature: 0, maxTokens: 10, model: provider.model }
      );
      const latency = Date.now() - start;
      if (content) {
        return { success: true, message: `连接成功 (${latency}ms)`, latency };
      }
      return { success: false, message: '连接成功但返回为空' };
    }

    const content = await callOpenAICompatible(
      provider,
      'You are a test assistant. Reply with exactly: OK',
      'Hi',
      { temperature: 0, maxTokens: 10, model: provider.model }
    );
    const latency = Date.now() - start;
    if (content) {
      return { success: true, message: `连接成功 (${latency}ms)`, latency };
    }
    return { success: false, message: '连接成功但返回为空' };
  } catch (error) {
    return { success: false, message: `连接失败: ${(error as Error).message}` };
  }
}

/**
 * 测试图片供应商连接（验证 API 端点可达）
 */
export async function testImageConnection(provider: ProviderConfig): Promise<TestConnectionResult> {
  const start = Date.now();
  try {
    const baseUrl = provider.baseUrl.replace(/\/+$/, '');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${provider.apiKey}`,
    };
    if (provider.authType === 'x-api-key') {
      headers['x-api-key'] = provider.apiKey;
      delete headers['Authorization'];
    }

    // 发送一个小请求测试连接
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers,
    });
    const latency = Date.now() - start;
    if (response.ok || response.status === 404 || response.status === 405) {
      // 404/405 也说明服务器可达，只是该端点不存在
      return { success: true, message: `连接成功 (${latency}ms)`, latency };
    }
    return { success: false, message: `连接失败: HTTP ${response.status}` };
  } catch (error) {
    return { success: false, message: `连接失败: ${(error as Error).message}` };
  }
}

/**
 * 测试音频供应商连接
 */
export async function testAudioConnection(provider: ProviderConfig): Promise<TestConnectionResult> {
  const start = Date.now();
  try {
    const result = await callTTSProvider(provider, '测试', 'default', 'zh', provider.model);
    const latency = Date.now() - start;
    if (result.base64) {
      return { success: true, message: `连接成功 (${latency}ms)`, latency };
    }
    return { success: false, message: '连接成功但未返回音频' };
  } catch (error) {
    return { success: false, message: `连接失败: ${(error as Error).message}` };
  }
}
