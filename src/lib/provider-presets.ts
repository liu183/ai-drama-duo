/**
 * AI 供应商预设配置
 * 包含主流文本、图片、视频、音频生成服务供应商
 * 每个预设提供 baseUrl 和推荐模型列表，方便用户快速配置
 */

export interface ProviderPreset {
  id: string;
  name: string;
  icon: string;          // emoji icon
  description: string;
  supportedTypes: ('text' | 'image' | 'video' | 'audio')[];
  baseUrl: string;
  docsUrl?: string;
  models: {
    type: 'text' | 'image' | 'video' | 'audio';
    modelId: string;
    label: string;
    description?: string;
  }[];
}

// ==================== 供应商预设列表 ====================

export const PROVIDER_PRESETS: ProviderPreset[] = [
  // ==================== 国内供应商 ====================
  {
    id: 'dashscope',
    name: '通义千问 (DashScope)',
    icon: '🔮',
    description: '阿里云百炼平台，支持通义千问系列大模型',
    supportedTypes: ['text', 'image', 'audio'],
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    docsUrl: 'https://help.aliyun.com/zh/dashscope/',
    models: [
      { type: 'text', modelId: 'qwen-max', label: '通义千问-Max', description: '最强推理能力' },
      { type: 'text', modelId: 'qwen-plus', label: '通义千问-Plus', description: '均衡性能' },
      { type: 'text', modelId: 'qwen-turbo', label: '通义千问-Turbo', description: '快速响应' },
      { type: 'text', modelId: 'qwen-long', label: '通义千问-Long', description: '超长上下文' },
      { type: 'image', modelId: 'wanx-v1', label: '通义万相', description: '中文图片生成' },
      { type: 'image', modelId: 'flux-schnell', label: 'Flux Schnell', description: '快速图生成' },
      { type: 'audio', modelId: 'cosyvoice-v1', label: 'CosyVoice', description: '多语言TTS' },
      { type: 'audio', modelId: 'sambert-zhiyan-v1', label: '知燕语音合成', description: '高质量中文TTS' },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    icon: '🧠',
    description: '智谱清言，GLM 系列大模型，OpenAI 兼容接口',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    docsUrl: 'https://open.bigmodel.cn/',
    models: [
      { type: 'text', modelId: 'glm-4-plus', label: 'GLM-4-Plus', description: '增强推理' },
      { type: 'text', modelId: 'glm-4', label: 'GLM-4', description: '通用能力' },
      { type: 'text', modelId: 'glm-4-flash', label: 'GLM-4-Flash', description: '免费快速' },
      { type: 'text', modelId: 'glm-4-long', label: 'GLM-4-Long', description: '长文本' },
      { type: 'image', modelId: 'cogview-3-flash', label: 'CogView-3-Flash', description: '快速图生成' },
      { type: 'image', modelId: 'cogview-3-plus', label: 'CogView-3-Plus', description: '高质量图生成' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🌊',
    description: '深度求索，高性能推理模型，性价比极高',
    supportedTypes: ['text'],
    baseUrl: 'https://api.deepseek.com/v1',
    docsUrl: 'https://platform.deepseek.com/',
    models: [
      { type: 'text', modelId: 'deepseek-chat', label: 'DeepSeek-V3', description: '通用对话' },
      { type: 'text', modelId: 'deepseek-reasoner', label: 'DeepSeek-R1', description: '深度推理' },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    icon: '🌙',
    description: 'Kimi 智能助手，长上下文理解能力强',
    supportedTypes: ['text'],
    baseUrl: 'https://api.moonshot.cn/v1',
    docsUrl: 'https://platform.moonshot.cn/',
    models: [
      { type: 'text', modelId: 'moonshot-v1-128k', label: 'Moonshot-V1-128K', description: '128K上下文' },
      { type: 'text', modelId: 'moonshot-v1-32k', label: 'Moonshot-V1-32K', description: '32K上下文' },
      { type: 'text', modelId: 'moonshot-v1-8k', label: 'Moonshot-V1-8K', description: '8K上下文' },
    ],
  },
  {
    id: 'xiaomi',
    name: '小米 (Xiaomi / MiLM)',
    icon: '📱',
    description: '小米大模型 MiLM，支持文本生成和图片生成',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://api.mi.com/v1',
    docsUrl: 'https://dev.mi.com/console/doc/',
    models: [
      { type: 'text', modelId: 'MiLM-1.5', label: 'MiLM-1.5', description: '小米大模型15亿参数' },
      { type: 'text', modelId: 'MiLM-6B', label: 'MiLM-6B', description: '小米大模型60亿参数' },
      { type: 'image', modelId: 'Mi Image Gen', label: '小米图片生成', description: '中文场景图生成' },
    ],
  },
  {
    id: 'baidu',
    name: '百度千帆 (Baidu)',
    icon: '🐾',
    description: '百度智能云千帆平台，文心一言系列',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://qianfan.baidubce.com/v2',
    docsUrl: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/',
    models: [
      { type: 'text', modelId: 'ernie-4.0-8k', label: '文心一言 4.0', description: '旗舰版' },
      { type: 'text', modelId: 'ernie-4.0-turbo-8k', label: '文心一言 4.0 Turbo', description: '快速版' },
      { type: 'text', modelId: 'ernie-speed-128k', label: '文心一言 Speed', description: '高速版' },
      { type: 'text', modelId: 'deepseek-v3', label: 'DeepSeek V3', description: '千帆托管' },
      { type: 'image', modelId: 'stable-diffusion-xl', label: 'SD-XL', description: '图片生成' },
    ],
  },
  {
    id: 'volcengine',
    name: '火山引擎 (豆包)',
    icon: '🔥',
    description: '字节跳动火山引擎，豆包大模型系列',
    supportedTypes: ['text', 'image', 'audio'],
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    docsUrl: 'https://www.volcengine.com/docs/82379/',
    models: [
      { type: 'text', modelId: 'doubao-pro-32k', label: '豆包-Pro-32K', description: '高级推理' },
      { type: 'text', modelId: 'doubao-pro-128k', label: '豆包-Pro-128K', description: '长上下文' },
      { type: 'text', modelId: 'doubao-lite-32k', label: '豆包-Lite-32K', description: '轻量快速' },
      { type: 'image', modelId: 'doubao-seedream', label: '豆包-SeedReam', description: '图片生成' },
      { type: 'audio', modelId: 'doubao-tts', label: '豆包-TTS', description: '语音合成' },
    ],
  },
  {
    id: 'tencent',
    name: '腾讯混元 (Tencent)',
    icon: '🐧',
    description: '腾讯混元大模型，OpenAI 兼容接口',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    docsUrl: 'https://cloud.tencent.com/document/product/1729/',
    models: [
      { type: 'text', modelId: 'hunyuan-pro', label: '混元-Pro', description: '旗舰版' },
      { type: 'text', modelId: 'hunyuan-standard', label: '混元-Standard', description: '标准版' },
      { type: 'text', modelId: 'hunyuan-lite', label: '混元-Lite', description: '轻量版' },
      { type: 'image', modelId: 'hunyuan-image', label: '混元图片生成', description: '文生图' },
    ],
  },

  // ==================== 国际供应商 ====================
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT 系列模型，行业领先',
    supportedTypes: ['text', 'image', 'audio'],
    baseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/docs/',
    models: [
      { type: 'text', modelId: 'gpt-4o', label: 'GPT-4o', description: '全能旗舰' },
      { type: 'text', modelId: 'gpt-4o-mini', label: 'GPT-4o-mini', description: '轻量快速' },
      { type: 'text', modelId: 'gpt-4-turbo', label: 'GPT-4-Turbo', description: '增强版' },
      { type: 'text', modelId: 'o3-mini', label: 'o3-mini', description: '推理模型' },
      { type: 'image', modelId: 'dall-e-3', label: 'DALL-E 3', description: '高质量图生成' },
      { type: 'audio', modelId: 'tts-1', label: 'TTS-1', description: '语音合成' },
      { type: 'audio', modelId: 'tts-1-hd', label: 'TTS-1-HD', description: '高清语音合成' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    icon: '🎯',
    description: 'Claude 系列模型，安全可靠',
    supportedTypes: ['text'],
    baseUrl: 'https://api.anthropic.com/v1',
    docsUrl: 'https://docs.anthropic.com/',
    models: [
      { type: 'text', modelId: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: '均衡版' },
      { type: 'text', modelId: 'claude-opus-4-20250514', label: 'Claude Opus 4', description: '旗舰版' },
      { type: 'text', modelId: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: '经典版' },
    ],
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    icon: '💎',
    description: 'Gemini 系列模型，多模态能力强',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    docsUrl: 'https://ai.google.dev/docs/',
    models: [
      { type: 'text', modelId: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: '旗舰版' },
      { type: 'text', modelId: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: '快速版' },
      { type: 'text', modelId: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', description: '经济版' },
      { type: 'image', modelId: 'gemini-2.0-flash-exp', label: 'Gemini 图像生成', description: '原生图生成' },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    icon: '💚',
    description: 'NVIDIA 推理微服务，开源模型加速',
    supportedTypes: ['text', 'image', 'video'],
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    docsUrl: 'https://build.nvidia.com/',
    models: [
      { type: 'text', modelId: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Llama 3.1 Nemotron 70B', description: '开源对话' },
      { type: 'text', modelId: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B', description: '超大参数' },
      { type: 'image', modelId: 'black-forest-labs/flux-schnell', label: 'Flux Schnell', description: '快速图生成' },
      { type: 'image', modelId: 'black-forest-labs/flux-dev', label: 'Flux Dev', description: '高质量图生成' },
      { type: 'image', modelId: 'stabilityai/stable-diffusion-xl', label: 'SDXL', description: '经典图生成' },
    ],
  },
  {
    id: 'kling',
    name: '可灵 AI (Kling)',
    icon: '🎬',
    description: '快手可灵，专业视频生成',
    supportedTypes: ['video', 'image'],
    baseUrl: 'https://api.klingai.com/v1',
    docsUrl: 'https://docs.kuaishou.com/kling-ai/',
    models: [
      { type: 'video', modelId: 'kling-v1', label: '可灵 V1', description: '标准视频' },
      { type: 'video', modelId: 'kling-v1-pro', label: '可灵 V1 Pro', description: '高质量视频' },
      { type: 'image', modelId: 'kling-image', label: '可灵图片', description: '图片生成' },
    ],
  },
  {
    id: 'stabilityai',
    name: 'Stability AI',
    icon: '🎨',
    description: 'Stable Diffusion 官方 API',
    supportedTypes: ['image'],
    baseUrl: 'https://api.stability.ai/v1',
    docsUrl: 'https://platform.stability.ai/docs/',
    models: [
      { type: 'image', modelId: 'stable-diffusion-xl-1024-v1-0', label: 'SDXL 1.0', description: '经典SDXL' },
      { type: 'image', modelId: 'stable-image-ultra', label: 'Stable Image Ultra', description: '最新旗舰' },
      { type: 'image', modelId: 'stable-image-core', label: 'Stable Image Core', description: '快速生成' },
    ],
  },
  {
    id: 'midjourney',
    name: 'Midjourney (API代理)',
    icon: '🖼️',
    description: 'Midjourney 图片生成（需第三方API代理）',
    supportedTypes: ['image'],
    baseUrl: 'https://api.mymidjourney.ai/api/v1',
    docsUrl: '',
    models: [
      { type: 'image', modelId: 'midjourney', label: 'Midjourney', description: '艺术风格生成' },
    ],
  },
  {
    id: 'runway',
    name: 'Runway',
    icon: '🎥',
    description: '专业 AI 视频生成',
    supportedTypes: ['video'],
    baseUrl: 'https://api.dev.runwayml.com/v1',
    docsUrl: 'https://docs.runwayml.com/',
    models: [
      { type: 'video', modelId: 'gen3a-turbo', label: 'Gen-3 Alpha Turbo', description: '快速视频' },
      { type: 'video', modelId: 'gen3a', label: 'Gen-3 Alpha', description: '高质量视频' },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    icon: '🎙️',
    description: '领先 AI 语音合成和克隆',
    supportedTypes: ['audio'],
    baseUrl: 'https://api.elevenlabs.io/v1',
    docsUrl: 'https://elevenlabs.io/docs/',
    models: [
      { type: 'audio', modelId: 'eleven_multilingual_v2', label: 'Multilingual v2', description: '多语言TTS' },
      { type: 'audio', modelId: 'eleven_turbo_v2_5', label: 'Turbo v2.5', description: '快速TTS' },
      { type: 'audio', modelId: 'eleven_monolingual_v1', label: 'English v1', description: '英文TTS' },
    ],
  },
  {
    id: 'custom',
    name: '自定义 / OpenAI 兼容',
    icon: '⚙️',
    description: '任何兼容 OpenAI Chat Completions 接口的服务',
    supportedTypes: ['text', 'image', 'video', 'audio'],
    baseUrl: '',
    models: [],
  },
];

/**
 * 根据供应商 ID 获取预设
 */
export function getProviderPreset(providerId: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(p => p.id === providerId);
}

/**
 * 根据服务类型获取支持的供应商列表
 */
export function getProvidersByType(serviceType: 'text' | 'image' | 'video' | 'audio'): ProviderPreset[] {
  return PROVIDER_PRESETS.filter(p => p.supportedTypes.includes(serviceType));
}

/**
 * 获取指定供应商和服务类型的模型列表
 */
export function getModelsByProviderAndType(
  providerId: string,
  serviceType: 'text' | 'image' | 'video' | 'audio'
): { modelId: string; label: string; description?: string }[] {
  const preset = getProviderPreset(providerId);
  if (!preset) return [];
  return preset.models.filter(m => m.type === serviceType);
}
