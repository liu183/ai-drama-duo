// ==================== Status Map ====================

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  in_progress: { label: '进行中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  scripted: { label: '已编剧', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  composed: { label: '已合成', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  merged: { label: '已合并', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: '失败', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  pending: { label: '待处理', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  partial_composed: { label: '部分合成', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

export const ROLE_MAP: Record<string, string> = {
  protagonist: '主角',
  antagonist: '反派',
  supporting: '配角',
  extra: '群演',
};

export const GENRES = ['都市', '古装', '玄幻', '悬疑', '甜宠', '搞笑', '励志', '科幻', '其他'];

export const STYLES = [
  { value: 'realistic', label: '真实' },
  { value: 'anime', label: '动漫' },
  { value: 'ghibli', label: '吉卜力' },
  { value: 'cinematic', label: '电影' },
  { value: 'comic', label: '漫画' },
  { value: 'watercolor', label: '水彩' },
];

export const STYLE_LABELS: Record<string, string> = {
  realistic: '真实',
  anime: '动漫',
  ghibli: '吉卜力',
  cinematic: '电影',
  comic: '漫画',
  watercolor: '水彩',
};

export const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

export const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9 横屏' },
  { value: '9:16', label: '9:16 竖屏' },
  { value: '1:1', label: '1:1 方形' },
  { value: '4:3', label: '4:3 经典' },
  { value: '3:4', label: '3:4 竖版经典' },
];

export const RESOLUTION_OPTIONS = [
  { value: '1920x1080', label: '1920x1080 (1080P)' },
  { value: '1280x720', label: '1280x720 (720P)' },
  { value: '1080x1920', label: '1080x1920 (竖屏)' },
  { value: '720x1280', label: '720x1280 (竖屏720)' },
];

export const TRANSITION_OPTIONS = [
  { value: 'none', label: '无转场' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'dissolve', label: '溶解' },
  { value: 'wipe', label: '擦除' },
];

export const DEFAULT_STYLE_CONFIG: import('@/types').ImageStyleConfig = {
  aspectRatio: '16:9',
  qualityKeywords: '8K UHD, masterpiece, best quality, ultra detailed',
  negativePrompts: 'blurry, low quality, watermark, text, distorted face, extra fingers',
  stylePromptPrefix: 'cinematic, dramatic lighting, film grain, shallow depth of field',
};

// ==================== Pipeline Step Config ====================

export const PIPELINE_STEPS = [
  { key: 'raw_content', label: '原始内容', emoji: '📝' },
  { key: 'script_rewrite', label: 'AI改写', emoji: '✍️' },
  { key: 'character_extract', label: '角色提取', emoji: '👥' },
  { key: 'voice_assign', label: '配音分配', emoji: '🎭' },
  { key: 'storyboard', label: '分镜拆解', emoji: '🎬' },
  { key: 'image_gen', label: '画面生成', emoji: '🖼️' },
  { key: 'video_gen', label: '视频生成', emoji: '🎥' },
  { key: 'tts', label: '配音合成', emoji: '🎵' },
  { key: 'compose', label: '成片合成', emoji: '🔗' },
  { key: 'merge', label: '集数合并', emoji: '📦' },
  { key: 'export', label: '导出完成', emoji: '✅' },
] as const;

export const AGENT_TYPES: Record<string, string> = {
  script_rewrite: 'script_rewriter',
  character_extract: 'extractor',
  voice_assign: 'voice_assigner',
  storyboard: 'storyboard_breaker',
  image_gen: 'image_prompt_generator',
  video_gen: 'video_prompt_generator',
};

export const AGENT_STEPS: Record<string, string[]> = {
  script_rewriter: [
    '分析原始小说内容...',
    '识别场景和人物...',
    '提取关键对话和动作...',
    '转换为剧本格式...',
    '优化剧本节奏和结构...',
    '输出最终剧本...',
  ],
  extractor: [
    '分析剧本内容...',
    '识别出场角色...',
    '提取角色特征和关系...',
    '识别场景信息...',
    '生成角色和场景数据...',
  ],
  voice_assigner: [
    '加载角色列表...',
    '分析角色性格特征...',
    '匹配最佳配音风格...',
    '分配配音方案...',
  ],
  storyboard_breaker: [
    '分析剧本结构...',
    '划分场景段落...',
    '设计镜头语言...',
    '标注动作和对话...',
    '计算各镜头时长...',
    '输出分镜脚本...',
  ],
  image_prompt_generator: [
    '加载分镜数据...',
    '分析场景氛围...',
    '生成画面构图描述...',
    '添加风格和细节提示...',
    '输出英文提示词...',
  ],
  video_prompt_generator: [
    '加载分镜和画面数据...',
    '分析镜头运动方式...',
    '设计动态过渡效果...',
    '生成运动描述提示词...',
    '标注推荐视频参数...',
    '输出视频提示词...',
  ],
};
