---
Task ID: 1
Agent: main
Task: 完善模型供应商配置，支持多种文本、图片、适配生成的模型供应商，添加小米供应商

Work Log:
- 分析现有代码架构：AiServiceConfig表存在但未被API路由使用，硬编码双模式(Z.ai SDK / NVIDIA env vars)
- 创建 src/lib/provider-presets.ts：16+供应商预设系统，包括通义千问、智谱AI、DeepSeek、月之暗面、小米、百度千帆、火山引擎、腾讯混元、OpenAI、Anthropic、Google、NVIDIA、可灵、StabilityAI、Runway、ElevenLabs
- 创建 src/lib/ai-providers.ts：统一AI调用层，支持DB配置读取、30秒缓存、优先级fallback链、Z.ai SDK兼容、连接测试
- 创建 src/app/api/ai-configs/test/route.ts：供应商连接测试API
- 更新 src/app/api/ai-configs/[id]/route.ts：增删改时清除缓存
- 重构 src/components/settings-view.tsx：供应商预设下拉选择、模型推荐、启用/禁用开关、优先级显示、连接测试按钮、服务类型过滤标签
- 重构 src/app/api/agent/route.ts：使用 generateText() 替代硬编码 callLLM
- 重构 src/app/api/generate/image/route.ts：使用 generateImage() 替代硬编码
- 重构 src/app/api/generate/tts/route.ts：使用 generateTTS() 替代硬编码
- 重构 src/app/api/generate/video/route.ts：使用 generateVideo() 替代硬编码
- 修复编译错误，清理无用示例文件，成功部署到 Vercel

Stage Summary:
- 16+ AI供应商预设覆盖国内外主流服务
- 小米(MiLM)供应商已添加，支持 MiLM-1.5/MiLM-6B 文本生成和图片生成
- 所有4个AI路由(image/tts/video/text)现在从DB读取配置，支持fallback链
- Settings UI全面升级，支持一键选择供应商预设+推荐模型
- 已部署到 https://ai-drama-duo.vercel.app
