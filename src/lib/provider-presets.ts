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
  category: 'domestic' | 'international' | 'custom';
  supportedTypes: ('text' | 'image' | 'video' | 'audio')[];
  baseUrl: string;
  docsUrl?: string;
  /** 部分供应商需要特殊的请求头，如 Anthropic 的 x-api-key */
  authType?: 'bearer' | 'x-api-key' | 'custom';
  /** Anthropic 用 /v1/messages 而非 /v1/chat/completions */
  apiFormat?: 'openai' | 'anthropic';
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
    description: '阿里云百炼平台，支持通义千问系列大模型、通义万相图片生成和 CosyVoice 语音合成',
    category: 'domestic',
    supportedTypes: ['text', 'image', 'audio'],
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    docsUrl: 'https://help.aliyun.com/zh/dashscope/',
    models: [
      { type: 'text', modelId: 'qwen-max', label: '通义千问-Max', description: '最强推理能力，旗舰模型' },
      { type: 'text', modelId: 'qwen-max-latest', label: '通义千问-Max-Latest', description: '最新旗舰' },
      { type: 'text', modelId: 'qwen-plus', label: '通义千问-Plus', description: '均衡性能与成本' },
      { type: 'text', modelId: 'qwen-turbo', label: '通义千问-Turbo', description: '快速响应，适合高并发' },
      { type: 'text', modelId: 'qwen-long', label: '通义千问-Long', description: '超长上下文，支持1M tokens' },
      { type: 'text', modelId: 'qwen-vl-max', label: '通义千问-VL-Max', description: '视觉理解旗舰' },
      { type: 'image', modelId: 'wanx-v1', label: '通义万相', description: '中文场景图片生成' },
      { type: 'image', modelId: 'wanx2.1-t2i-turbo', label: '万相2.1-Turbo', description: '快速文生图' },
      { type: 'image', modelId: 'flux-schnell', label: 'Flux Schnell', description: '开源快速图生成' },
      { type: 'audio', modelId: 'cosyvoice-v1', label: 'CosyVoice', description: '多语言TTS，音色丰富' },
      { type: 'audio', modelId: 'cosyvoice-v2', label: 'CosyVoice V2', description: '升级版语音合成' },
      { type: 'audio', modelId: 'sambert-zhiyan-v1', label: '知燕语音合成', description: '高质量中文TTS' },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    icon: '🧠',
    description: '智谱清言，GLM 系列大模型，OpenAI 兼容接口，支持 CogView 图片生成',
    category: 'domestic',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    docsUrl: 'https://open.bigmodel.cn/',
    models: [
      { type: 'text', modelId: 'glm-4-plus', label: 'GLM-4-Plus', description: '增强推理，旗舰能力' },
      { type: 'text', modelId: 'glm-4-0520', label: 'GLM-4-0520', description: 'GLM-4最新版' },
      { type: 'text', modelId: 'glm-4', label: 'GLM-4', description: '通用对话能力' },
      { type: 'text', modelId: 'glm-4-flash', label: 'GLM-4-Flash', description: '免费快速，适合轻量任务' },
      { type: 'text', modelId: 'glm-4-long', label: 'GLM-4-Long', description: '长文本处理' },
      { type: 'text', modelId: 'glm-4v-plus', label: 'GLM-4V-Plus', description: '视觉理解' },
      { type: 'image', modelId: 'cogview-3-flash', label: 'CogView-3-Flash', description: '快速文生图，免费' },
      { type: 'image', modelId: 'cogview-3-plus', label: 'CogView-3-Plus', description: '高质量文生图' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (深度求索)',
    icon: '🌊',
    description: '高性能推理模型，DeepSeek-V3 和 R1 系列性价比极高，擅长代码和数学',
    category: 'domestic',
    supportedTypes: ['text'],
    baseUrl: 'https://api.deepseek.com/v1',
    docsUrl: 'https://platform.deepseek.com/',
    models: [
      { type: 'text', modelId: 'deepseek-chat', label: 'DeepSeek-V3', description: '通用对话，性价比之王' },
      { type: 'text', modelId: 'deepseek-reasoner', label: 'DeepSeek-R1', description: '深度推理，Chain-of-Thought' },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    icon: '🌙',
    description: 'Kimi 智能助手，超长上下文理解能力强，适合处理长文档',
    category: 'domestic',
    supportedTypes: ['text'],
    baseUrl: 'https://api.moonshot.cn/v1',
    docsUrl: 'https://platform.moonshot.cn/',
    models: [
      { type: 'text', modelId: 'moonshot-v1-128k', label: 'Moonshot V1-128K', description: '128K超长上下文' },
      { type: 'text', modelId: 'moonshot-v1-32k', label: 'Moonshot V1-32K', description: '32K上下文' },
      { type: 'text', modelId: 'moonshot-v1-8k', label: 'Moonshot V1-8K', description: '8K上下文，快速' },
    ],
  },
  {
    id: 'xiaomi',
    name: '小米 (MiMo / 小米大模型)',
    icon: '📱',
    description: '小米大模型 MiMo 系列，支持文本生成和语音合成（TTS），OpenAI 兼容接口',
    category: 'domestic',
    supportedTypes: ['text', 'audio'],
    baseUrl: 'https://api.ai.mi.com/v1',
    docsUrl: 'https://dev.mi.com/docus/overview/milm/',
    models: [
      // V2.5 系列
      { type: 'text', modelId: 'MiMo-V2.5-Pro', label: 'MiMo-V2.5-Pro', description: '旗舰推理模型' },
      { type: 'text', modelId: 'MiMo-V2.5', label: 'MiMo-V2.5', description: '标准对话模型' },
      { type: 'audio', modelId: 'MiMo-V2.5-TTS-VoiceClone', label: 'MiMo-V2.5-TTS-VoiceClone', description: '语音克隆合成' },
      { type: 'audio', modelId: 'MiMo-V2.5-TTS-VoiceDesign', label: 'MiMo-V2.5-TTS-VoiceDesign', description: '自定义音色合成' },
      { type: 'audio', modelId: 'MiMo-V2.5-TTS', label: 'MiMo-V2.5-TTS', description: '标准语音合成' },
      // V2 系列
      { type: 'text', modelId: 'MiMo-V2-Pro', label: 'MiMo-V2-Pro', description: 'V2旗舰推理' },
      { type: 'text', modelId: 'MiMo-V2', label: 'MiMo-V2', description: 'V2标准对话' },
      { type: 'audio', modelId: 'MiMo-V2-TTS', label: 'MiMo-V2-TTS', description: 'V2语音合成' },
    ],
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    icon: '⚡',
    description: 'MiniMax 海螺AI，支持文本、语音、视频生成，多模态能力强',
    category: 'domestic',
    supportedTypes: ['text', 'audio', 'video'],
    baseUrl: 'https://api.minimax.chat/v1',
    docsUrl: 'https://www.minimaxi.com/document/guides/chat-model/V2',
    models: [
      { type: 'text', modelId: 'MiniMax-Text-01', label: 'MiniMax-Text-01', description: '旗舰文本模型' },
      { type: 'text', modelId: 'abab6.5s-chat', label: 'abab6.5s-chat', description: '快速对话模型' },
      { type: 'audio', modelId: 'speech-01-turbo', label: 'Speech-01-Turbo', description: '快速语音合成' },
      { type: 'audio', modelId: 'speech-01', label: 'Speech-01', description: '高质量语音合成' },
      { type: 'video', modelId: 'video-01', label: 'Video-01', description: '视频生成' },
    ],
  },
  {
    id: 'baidu',
    name: '百度千帆 (Baidu)',
    icon: '🐾',
    description: '百度智能云千帆平台，文心一言系列，支持文心图片生成',
    category: 'domestic',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://qianfan.baidubce.com/v2',
    docsUrl: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/',
    models: [
      { type: 'text', modelId: 'ernie-4.0-8k', label: '文心一言 4.0', description: '旗舰版' },
      { type: 'text', modelId: 'ernie-4.0-turbo-8k', label: '文心一言 4.0 Turbo', description: '快速版' },
      { type: 'text', modelId: 'ernie-speed-128k', label: '文心 Speed', description: '高速长文本' },
      { type: 'text', modelId: 'ernie-lite-8k', label: '文心 Lite', description: '轻量版' },
      { type: 'text', modelId: 'deepseek-v3', label: 'DeepSeek V3(千帆)', description: '千帆托管DeepSeek' },
      { type: 'image', modelId: 'stable-diffusion-xl', label: 'SD-XL', description: '百度SD-XL图生成' },
    ],
  },
  {
    id: 'volcengine',
    name: '火山引擎 (豆包)',
    icon: '🔥',
    description: '字节跳动火山引擎，豆包大模型系列，SeedReam 图片生成',
    category: 'domestic',
    supportedTypes: ['text', 'image', 'audio'],
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    docsUrl: 'https://www.volcengine.com/docs/82379/',
    models: [
      { type: 'text', modelId: 'doubao-pro-32k', label: '豆包-Pro-32K', description: '高级推理能力' },
      { type: 'text', modelId: 'doubao-pro-128k', label: '豆包-Pro-128K', description: '长上下文' },
      { type: 'text', modelId: 'doubao-lite-32k', label: '豆包-Lite-32K', description: '轻量快速' },
      { type: 'image', modelId: 'doubao-seedream', label: '豆包-SeedReam', description: '高质量图片生成' },
      { type: 'audio', modelId: 'doubao-tts', label: '豆包-TTS', description: '语音合成' },
    ],
  },
  {
    id: 'tencent',
    name: '腾讯混元 (Tencent)',
    icon: '🐧',
    description: '腾讯混元大模型，OpenAI 兼容接口，支持混元图片生成',
    category: 'domestic',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    docsUrl: 'https://cloud.tencent.com/document/product/1729/',
    models: [
      { type: 'text', modelId: 'hunyuan-pro', label: '混元-Pro', description: '旗舰版' },
      { type: 'text', modelId: 'hunyuan-standard', label: '混元-Standard', description: '标准版' },
      { type: 'text', modelId: 'hunyuan-lite', label: '混元-Lite', description: '轻量版' },
      { type: 'text', modelId: 'hunyuan-turbo', label: '混元-Turbo', description: '高速版' },
      { type: 'image', modelId: 'hunyuan-image', label: '混元图片生成', description: '文生图' },
    ],
  },
  {
    id: 'baichuan',
    name: '百川智能 (Baichuan)',
    icon: '🏔️',
    description: '百川大模型，Baichuan4 系列中文能力强',
    category: 'domestic',
    supportedTypes: ['text'],
    baseUrl: 'https://api.baichuan-ai.com/v1',
    docsUrl: 'https://platform.baichuan-ai.com/',
    models: [
      { type: 'text', modelId: 'Baichuan4', label: 'Baichuan4', description: '旗舰模型' },
      { type: 'text', modelId: 'Baichuan3-Turbo', label: 'Baichuan3-Turbo', description: '快速版' },
      { type: 'text', modelId: 'Baichuan3-Turbo-128k', label: 'Baichuan3-Turbo-128K', description: '长上下文' },
    ],
  },
  {
    id: 'yi',
    name: '零一万物 (01.AI / Yi)',
    icon: '🌟',
    description: '李开复创办，Yi 系列大模型，开源友好',
    category: 'domestic',
    supportedTypes: ['text'],
    baseUrl: 'https://api.lingyiwanwu.com/v1',
    docsUrl: 'https://platform.lingyiwanwu.com/',
    models: [
      { type: 'text', modelId: 'yi-lightning', label: 'Yi-Lightning', description: '超快速，性价比高' },
      { type: 'text', modelId: 'yi-large', label: 'Yi-Large', description: '旗舰模型' },
      { type: 'text', modelId: 'yi-medium', label: 'Yi-Medium', description: '均衡版' },
      { type: 'text', modelId: 'yi-spark', label: 'Yi-Spark', description: '轻量快速' },
    ],
  },
  {
    id: 'iflytek',
    name: '讯飞星火 (iFlytek)',
    icon: '✨',
    description: '科大讯飞星火大模型，语音技术积累深厚，支持TTS',
    category: 'domestic',
    supportedTypes: ['text', 'audio'],
    baseUrl: 'https://spark-api-open.xf-yun.com/v1',
    docsUrl: 'https://www.xfyun.cn/doc/spark/',
    models: [
      { type: 'text', modelId: 'generalv3.5', label: '星火3.5', description: '通用大模型' },
      { type: 'text', modelId: 'generalv3', label: '星火3.0', description: '经典版' },
      { type: 'text', modelId: '4.0Ultra', label: '星火4.0 Ultra', description: '最新旗舰' },
      { type: 'audio', modelId: 'tts-1', label: '讯飞TTS', description: '高质量中文语音合成' },
    ],
  },
  {
    id: 'sensetime',
    name: '商汤日日新 (SenseTime)',
    icon: '☀️',
    description: '商汤科技日日新大模型体系，图片生成能力强',
    category: 'domestic',
    supportedTypes: ['text', 'image', 'video'],
    baseUrl: 'https://api.sensenova.cn/v1',
    docsUrl: 'https://docs.sensenova.cn/',
    models: [
      { type: 'text', modelId: 'nova-ptc-xl', label: '日日新-PTC-XL', description: '大语言模型' },
      { type: 'image', modelId: 'sensenova-image', label: '日日新图片生成', description: '高质量文生图' },
      { type: 'video', modelId: 'sensenova-video', label: '日日新视频生成', description: '视频生成' },
    ],
  },
  {
    id: 'stepfun',
    name: '阶跃星辰 (StepFun)',
    icon: '🚀',
    description: '阶跃星辰 Step-1/Step-2 大模型，多模态能力强',
    category: 'domestic',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://api.stepfun.com/v1',
    docsUrl: 'https://platform.stepfun.com/',
    models: [
      { type: 'text', modelId: 'step-2-16k', label: 'Step-2-16K', description: '旗舰对话模型' },
      { type: 'text', modelId: 'step-1-8k', label: 'Step-1-8K', description: '标准对话模型' },
      { type: 'image', modelId: 'step-1x-image', label: 'Step-1X-Image', description: '图片生成' },
    ],
  },

  // ==================== 国际供应商 ====================
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'GPT 系列模型，行业领先，支持 DALL-E 图片生成和 TTS 语音合成',
    category: 'international',
    supportedTypes: ['text', 'image', 'audio'],
    baseUrl: 'https://api.openai.com/v1',
    docsUrl: 'https://platform.openai.com/docs/',
    models: [
      { type: 'text', modelId: 'gpt-4o', label: 'GPT-4o', description: '全能旗舰，多模态' },
      { type: 'text', modelId: 'gpt-4o-mini', label: 'GPT-4o-mini', description: '轻量快速，高性价比' },
      { type: 'text', modelId: 'gpt-4-turbo', label: 'GPT-4-Turbo', description: '增强推理' },
      { type: 'text', modelId: 'o3-mini', label: 'o3-mini', description: '推理模型' },
      { type: 'text', modelId: 'o4-mini', label: 'o4-mini', description: '最新推理模型' },
      { type: 'image', modelId: 'dall-e-3', label: 'DALL-E 3', description: '高质量文生图' },
      { type: 'image', modelId: 'gpt-image-1', label: 'GPT-Image-1', description: '原生图像生成' },
      { type: 'audio', modelId: 'tts-1', label: 'TTS-1', description: '语音合成' },
      { type: 'audio', modelId: 'tts-1-hd', label: 'TTS-1-HD', description: '高清语音合成' },
      { type: 'audio', modelId: 'gpt-4o-mini-tts', label: 'GPT-4o-mini-TTS', description: '多音色语音' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    icon: '🎯',
    description: 'Claude 系列模型，安全可靠，长文本理解能力强，使用独立API格式',
    category: 'international',
    supportedTypes: ['text'],
    baseUrl: 'https://api.anthropic.com',
    docsUrl: 'https://docs.anthropic.com/',
    authType: 'x-api-key',
    apiFormat: 'anthropic',
    models: [
      { type: 'text', modelId: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', description: '均衡版' },
      { type: 'text', modelId: 'claude-opus-4-20250514', label: 'Claude Opus 4', description: '旗舰版' },
      { type: 'text', modelId: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: '经典版' },
      { type: 'text', modelId: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', description: '快速版' },
    ],
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    icon: '💎',
    description: 'Gemini 系列模型，多模态能力强，OpenAI 兼容接口',
    category: 'international',
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
    description: 'NVIDIA 推理微服务，开源模型加速部署，支持 Llama、Flux 等',
    category: 'international',
    supportedTypes: ['text', 'image', 'video'],
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    docsUrl: 'https://build.nvidia.com/',
    models: [
      { type: 'text', modelId: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Llama 3.1 Nemotron 70B', description: '开源对话' },
      { type: 'text', modelId: 'meta/llama-3.1-405b-instruct', label: 'Llama 3.1 405B', description: '超大参数' },
      { type: 'text', modelId: 'mistralai/mixtral-8x22b-instruct-v0.1', label: 'Mixtral 8x22B', description: 'MoE架构' },
      { type: 'image', modelId: 'black-forest-labs/flux-schnell', label: 'Flux Schnell', description: '快速图生成' },
      { type: 'image', modelId: 'black-forest-labs/flux-dev', label: 'Flux Dev', description: '高质量图生成' },
      { type: 'image', modelId: 'stabilityai/stable-diffusion-xl', label: 'SDXL', description: '经典图生成' },
    ],
  },
  {
    id: 'kling',
    name: '可灵 AI (Kling)',
    icon: '🎬',
    description: '快手可灵，专业视频生成和图片生成，支持图生视频',
    category: 'international',
    supportedTypes: ['video', 'image'],
    baseUrl: 'https://api.klingai.com/v1',
    docsUrl: 'https://docs.kuaishou.com/kling-ai/',
    models: [
      { type: 'video', modelId: 'kling-v1', label: '可灵 V1', description: '标准视频生成' },
      { type: 'video', modelId: 'kling-v1-pro', label: '可灵 V1 Pro', description: '高质量视频' },
      { type: 'video', modelId: 'kling-v1-5', label: '可灵 V1.5', description: '升级版视频' },
      { type: 'video', modelId: 'kling-v2', label: '可灵 V2', description: '最新版视频' },
      { type: 'image', modelId: 'kling-image', label: '可灵图片', description: '高质量图片生成' },
    ],
  },
  {
    id: 'stabilityai',
    name: 'Stability AI',
    icon: '🎨',
    description: 'Stable Diffusion 官方 API，Stable Image 系列图片生成',
    category: 'international',
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
    description: 'Midjourney 图片生成（需第三方API代理服务）',
    category: 'international',
    supportedTypes: ['image'],
    baseUrl: 'https://api.mymidjourney.ai/api/v1',
    models: [
      { type: 'image', modelId: 'midjourney', label: 'Midjourney', description: '艺术风格生成' },
    ],
  },
  {
    id: 'runway',
    name: 'Runway',
    icon: '🎥',
    description: '专业 AI 视频生成平台',
    category: 'international',
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
    description: '领先 AI 语音合成和声音克隆，支持29种语言',
    category: 'international',
    supportedTypes: ['audio'],
    baseUrl: 'https://api.elevenlabs.io/v1',
    docsUrl: 'https://elevenlabs.io/docs/',
    models: [
      { type: 'audio', modelId: 'eleven_multilingual_v2', label: 'Multilingual v2', description: '多语言TTS' },
      { type: 'audio', modelId: 'eleven_turbo_v2_5', label: 'Turbo v2.5', description: '快速TTS' },
      { type: 'audio', modelId: 'eleven_monolingual_v1', label: 'English v1', description: '英文专用' },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    description: '超高速 LLM 推理服务，LPU 芯片加速，延迟极低',
    category: 'international',
    supportedTypes: ['text'],
    baseUrl: 'https://api.groq.com/openai/v1',
    docsUrl: 'https://console.groq.com/docs/',
    models: [
      { type: 'text', modelId: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', description: '高性能开源' },
      { type: 'text', modelId: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', description: '极速响应' },
      { type: 'text', modelId: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: 'MoE架构' },
      { type: 'text', modelId: 'gemma2-9b-it', label: 'Gemma 2 9B', description: 'Google开源' },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    icon: '🤝',
    description: '开源模型托管平台，支持多种开源大模型',
    category: 'international',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://api.together.xyz/v1',
    docsUrl: 'https://docs.together.ai/',
    models: [
      { type: 'text', modelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B Turbo', description: '开源对话' },
      { type: 'text', modelId: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B', description: 'MoE架构' },
      { type: 'text', modelId: 'Qwen/Qwen2.5-72B-Instruct-Turbo', label: 'Qwen2.5 72B Turbo', description: '通义千问' },
      { type: 'image', modelId: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell', description: '快速图生成' },
      { type: 'image', modelId: 'black-forest-labs/FLUX.1-dev', label: 'FLUX.1 Dev', description: '高质量图生成' },
      { type: 'image', modelId: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL', description: '经典图生成' },
    ],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow (硅基流动)',
    icon: '🔮',
    description: '国内开源模型推理平台，支持丰富开源模型，价格低廉',
    category: 'international',
    supportedTypes: ['text', 'image'],
    baseUrl: 'https://api.siliconflow.cn/v1',
    docsUrl: 'https://docs.siliconflow.cn/',
    models: [
      { type: 'text', modelId: 'Qwen/Qwen3-8B', label: 'Qwen3-8B', description: '通义千问3' },
      { type: 'text', modelId: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', description: '深度求索V3' },
      { type: 'text', modelId: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B', description: '智谱GLM4' },
      { type: 'image', modelId: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell', description: '快速图生成' },
      { type: 'image', modelId: 'stabilityai/stable-diffusion-3-5-large', label: 'SD 3.5 Large', description: '最新SD' },
    ],
  },

  // ==================== 自定义 ====================
  {
    id: 'custom',
    name: '自定义 / OpenAI 兼容',
    icon: '⚙️',
    description: '任何兼容 OpenAI Chat Completions / Images 接口的服务',
    category: 'custom',
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
 * 根据分类获取供应商列表
 */
export function getProvidersByCategory(category: 'domestic' | 'international' | 'custom'): ProviderPreset[] {
  return PROVIDER_PRESETS.filter(p => p.category === category);
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

/**
 * 获取所有支持的模型总数
 */
export function getTotalModelCount(): number {
  return PROVIDER_PRESETS.reduce((sum, p) => sum + p.models.length, 0);
}

/**
 * 获取所有支持的供应商总数（不含自定义）
 */
export function getTotalProviderCount(): number {
  return PROVIDER_PRESETS.filter(p => p.id !== 'custom').length;
}
