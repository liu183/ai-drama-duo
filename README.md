# AI Drama Duo - AI短剧创作平台

> AI驱动的短剧全流程创作工具，从原始小说到成片导出，覆盖11步自动化流水线。基于多Agent协作架构，让短剧创作从脚本编写到视频合成实现端到端自动化。

## 在线访问

**https://ai-drama-duo.vercel.app**

---

## 项目背景

短视频和短剧正在成为数字内容消费的主流形式，但短剧创作流程高度碎片化——编剧、分镜、角色设计、画面生成、配音、视频合成等环节通常需要多个工具和多类专业人员协作完成，创作门槛高、周期长、成本大。

AI Drama Duo 的目标是将整个短剧创作流程整合到一个平台中，借助大语言模型（LLM）和多模态AI能力，让普通创作者也能独立完成从小说文本到视频成片的全流程创作。通过定义标准化的11步流水线和多Agent协作架构，平台将每个创作环节模块化、自动化，大幅降低短剧创作门槛，提升创作效率。

## 核心功能与11步流水线

平台将短剧创作拆解为11个标准步骤，每一步对应一个独立的功能模块：

| 步骤 | 模块 | 说明 | 状态 |
|------|------|------|------|
| 1 | 原始内容 | 输入小说或文本素材，作为短剧创作的原始内容 | ✅ 已完成 |
| 2 | AI改写 | 调用LLM将原始内容智能转换为短剧剧本格式，提取场景、对话、动作 | ✅ 已完成 |
| 3 | 角色提取 | AI自动识别剧本中的角色、外貌、性格特征，生成角色卡 | ✅ 已完成 |
| 4 | 配音分配 | 基于角色性格自动匹配最佳配音风格和音色方案 | ✅ 已完成 |
| 5 | 分镜拆解 | 将剧本拆解为逐镜头分镜，包含镜头语言、景别、角度、动作标注、氛围描述 | ✅ 已完成 |
| 6 | 画面生成 | 基于分镜提示词生成故事板画面，支持提示词编辑和外部图片上传 | ✅ 已完成 |
| 7 | 视频生成 | 将故事板画面转化为动态视频片段（图生视频） | 🔨 开发中 |
| 8 | 配音合成 | TTS语音合成，为分镜对话生成配音 | 📋 规划中 |
| 9 | 成片合成 | 视频+音频+字幕合成，添加转场效果 | 📋 规划中 |
| 10 | 集数合并 | 多分镜片段按序合并为完整一集，添加片头片尾和BGM | 📋 规划中 |
| 11 | 导出完成 | 预览最终成果并导出为多种格式 | 📋 规划中 |

### 已实现功能详情

**剧本改写（Agent: script_rewriter）**
- 输入原始小说文本，AI自动分析内容结构
- 识别场景边界、人物关系、对话与动作
- 输出标准剧本格式，包含场景描述、角色台词、动作指示
- 支持多种风格改写（写实、古装、都市、玄幻等）

**角色提取（Agent: extractor）**
- 自动识别剧本中所有出场角色
- 提取角色外貌、服装、性格、口头禅等特征
- 建立角色关系图谱（主角、配角、群众）
- 生成结构化角色数据，支持后续画面生成时保持角色一致性

**配音分配（Agent: voice_assigner）**
- 基于角色性格和年龄自动匹配配音风格
- 支持多种音色标签：年轻男声、成熟女声、磁性男声等
- 配音方案可手动调整覆盖

**分镜拆解（Agent: storyboard_breaker）**
- 将剧本按场景自动拆分为逐镜头分镜
- 每个分镜包含：镜头类型（特写/中景/远景）、角度、运动方式、动作描述、氛围、对话
- 自动生成 imagePrompt 和 videoPrompt 用于后续生成
- 支持分镜拖拽排序和手动编辑

**画面生成（Agent: image_prompt_generator）**
- 基于分镜提示词调用AI图像生成
- 支持提示词一键复制到外部AI绘画工具
- 支持外部图片上传替换
- 画面与分镜自动关联，支持多版本管理

## 技术架构

### 整体架构

```
┌─────────────────────────────────────────────┐
│              前端 (Next.js 16)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ 项目列表  │ │ 短剧详情  │ │ 剧集工作室    │ │
│  │DramaList │ │DramaDetail│ │EpisodeStudio │ │
│  └──────────┘ └──────────┘ └──────────────┘ │
│  ┌──────────────────────────────────────┐    │
│  │     11步流水线 Step Navigator         │    │
│  └──────────────────────────────────────┘    │
├─────────────────────────────────────────────┤
│            API Routes (App Router)           │
│  /api/dramas  /api/episodes  /api/agent     │
│  /api/characters /api/storyboards            │
├─────────────────────────────────────────────┤
│              数据层 (Prisma ORM)              │
│  ┌──────────┐          ┌──────────────────┐  │
│  │ SQLite   │  本地开发  │ PostgreSQL      │  │
│  │          │  ◄──────► │  Vercel 生产    │  │
│  └──────────┘          └──────────────────┘  │
├─────────────────────────────────────────────┤
│            AI 服务层                         │
│  ┌──────────────────────────────────────┐    │
│  │ NVIDIA API (mixtral-8x22b-instruct)  │    │
│  │ 双模式: z-ai-sdk / Vercel fetch 直连  │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### 技术栈详情

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 16 (App Router) + React 19 | SSR/SSG、Server Components |
| UI组件库 | shadcn/ui + Radix UI | 无障碍、可定制、主题支持 |
| 样式方案 | Tailwind CSS 4 + tw-animate-css | 原子化CSS、动画工具类 |
| 动画引擎 | Framer Motion | 页面切换、视图过渡动画 |
| 状态管理 | Zustand + React Query | 轻量全局状态 + 服务端缓存 |
| ORM | Prisma 6 | 类型安全的数据访问 |
| 数据库 | SQLite / PostgreSQL | 本地开发 / Vercel生产 |
| AI模型 | NVIDIA NIM (mixtral-8x22b-instruct) | LLM推理、多Agent协作 |
| 拖拽排序 | @dnd-kit/core + @dnd-kit/sortable | 分镜排序 |
| 图标 | lucide-react | 统一图标库 |
| 包管理 | Bun | 高性能JS运行时 |
| 部署 | Vercel | 边缘部署、自动CI/CD |

### 多Agent协作架构

平台采用4种AI Agent处理不同创作环节，每种Agent有独立的系统提示词和参数配置：

| Agent | 对应步骤 | 职责 |
|-------|---------|------|
| script_rewriter | 步骤2 AI改写 | 小说转剧本，结构化剧本格式 |
| extractor | 步骤3 角色提取 | 识别角色、提取特征、建立关系 |
| voice_assigner | 步骤4 配音分配 | 角色性格分析、配音风格匹配 |
| storyboard_breaker | 步骤5 分镜拆解 | 场景划分、镜头设计、提示词生成 |
| image_prompt_generator | 步骤6 画面生成 | 画面提示词优化 |

### AI双模式调用

- **本地开发模式**：通过 `z-ai-web-dev-sdk` 调用AI服务
- **Vercel生产模式**：通过 `fetch` 直连 NVIDIA API（兼容 Vercel Edge Runtime）
- 自动检测运行环境，无需手动切换

## 数据模型

```
Drama (短剧项目)
├── Episode (剧集)
│   ├── EpisodeCharacter ◄── Character (角色)
│   ├── EpisodeScene ◄── Scene (场景)
│   └── Storyboard (分镜)
│       └── StoryboardCharacter ◄── Character
├── Character (角色)
│   └── StoryboardCharacter
└── Scene (场景)
    └── Storyboard

AiServiceConfig (AI服务配置)
AgentConfig (Agent提示词与参数)
AgentChatLog (Agent调用日志)
ImageGeneration (图片生成任务)
VideoGeneration (视频生成任务)
```

核心实体包含完整的生产流程数据：Drama → Episode → Storyboard → Image → Video，支持端到端追溯。

## 使用方法

### 1. 环境准备

```bash
# 克隆项目
git clone https://github.com/liu183/ai-drama-duo.git
cd ai-drama-duo

# 安装依赖
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入实际配置
```

### 2. 环境变量配置

```env
# 数据库（本地开发）
DATABASE_URL="file:./db/custom.db"

# AI服务配置
NVIDIA_API_KEY="your-nvidia-api-key"
NVIDIA_BASE_URL="https://integrate.api.nvidia.com/v1"
NVIDIA_MODEL="mistralai/mixtral-8x22b-instruct-v0.1"

# Vercel生产环境额外配置
DIRECT_URL="your-postgresql-direct-url"
```

### 3. 数据库初始化

```bash
# 本地开发：使用 SQLite
bun prisma db push
bun prisma generate

# 如果使用 PostgreSQL
bun prisma db push --schema=prisma/schema.postgres.prisma
```

### 4. 启动开发

```bash
bun run dev
# 访问 http://localhost:3000
```

### 5. 创作流程

1. **创建短剧项目** - 填写标题、描述、类型、集数
2. **进入剧集工作室** - 选择剧集，进入11步流水线
3. **步骤1** - 粘贴小说或文本内容
4. **步骤2** - 点击「AI改写」，自动生成剧本
5. **步骤3** - 点击「角色提取」，自动识别角色
6. **步骤4** - 查看/调整配音方案
7. **步骤5** - 点击「分镜拆解」，自动生成分镜
8. **步骤6** - 生成/上传画面
9. **步骤7~11** - 后续步骤持续迭代开发中

### 6. 生产部署

项目已配置 Vercel 自动部署，push 到 `main` 分支即自动构建发布。环境变量在 Vercel Dashboard 中配置。

## 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 主入口（视图路由切换）
│   ├── layout.tsx                  # 全局布局（主题、字体）
│   ├── globals.css                 # 全局样式
│   └── api/
│       ├── dramas/                 # 短剧项目 CRUD
│       │   ├── route.ts            # GET(列表) / POST(创建)
│       │   └── [id]/route.ts       # GET/PUT/DELETE
│       ├── episodes/               # 剧集 CRUD
│       │   └── [id]/route.ts
│       ├── characters/             # 角色 CRUD
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── scenes/route.ts         # 场景 CRUD
│       ├── storyboards/            # 分镜 CRUD
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── agent/route.ts          # AI Agent 调用入口
│       ├── agent-configs/route.ts  # Agent 配置管理
│       ├── ai-configs/[id]/route.ts # AI服务配置
│       └── route.ts                # 根路由
├── components/
│   ├── drama-list.tsx              # 短剧项目列表页
│   ├── drama-detail.tsx            # 短剧详情页（剧集管理）
│   ├── episode-studio.tsx          # 剧集工作室（11步流水线核心）
│   ├── settings-view.tsx           # AI配置设置页
│   └── ui/                         # shadcn/ui 基础组件库
│       ├── button.tsx, card.tsx, dialog.tsx
│       ├── tabs.tsx, input.tsx, textarea.tsx
│       ├── progress.tsx, skeleton.tsx, scroll-area.tsx
│       └── ... (40+ 组件)
├── lib/
│   ├── db.ts                       # 数据库双模式（SQLite/PostgreSQL）
│   ├── api.ts                      # API工具函数
│   └── utils.ts                    # 通用工具（cn等）
├── hooks/
│   ├── use-toast.ts               # Toast通知Hook
│   └── use-mobile.ts              # 移动端检测Hook
prisma/
├── schema.prisma                   # SQLite Schema（本地开发）
└── schema.postgres.prisma          # PostgreSQL Schema（Vercel生产）
```

## 当前进度

### v0.2 已完成 ✅

- [x] 短剧项目管理（CRUD、状态管理、标签系统）
- [x] 剧集管理（多集创建、剧本编辑、状态流转）
- [x] AI改写 - script_rewriter Agent
- [x] 角色提取 - extractor Agent
- [x] 配音分配 - voice_assigner Agent
- [x] 分镜拆解 - storyboard_breaker Agent
- [x] 画面提示词生成 - image_prompt_generator Agent
- [x] 分镜画面管理（提示词编辑、复制、外部图片上传）
- [x] 11步流水线UI框架（步骤导航、进度追踪、AI处理动画）
- [x] AI配置设置页（服务配置、Agent配置）
- [x] 暗色/亮色主题切换
- [x] 响应式布局（移动端适配）
- [x] 双数据库支持（SQLite本地 / PostgreSQL Vercel）
- [x] Vercel自动部署

### v0.3 进行中 🔨

- [ ] 第七步：视频生成模块（图生视频）
- [ ] 核心资产管理（角色一致性、场景一致性）
- [ ] AI处理中间过程UI渲染优化

### 规划中 📋

- [ ] 第八步：TTS配音合成
- [ ] 第九步：成片合成（视频+音频+字幕）
- [ ] 第十步：集数合并（片头片尾+BGM）
- [ ] 第十一步：多格式导出
- [ ] 角色一致性引擎（跨分镜角色外貌保持）
- [ ] 场景资产管理（场景参考图、氛围板）
- [ ] 批量操作（批量生成画面、批量生成视频）
- [ ] 多语言支持（i18n）

## 开发迭代计划

### Phase 1: 基础创作流程 (v0.1 - v0.2) ✅

目标：完成从文本到画面的完整链路

- v0.1 项目搭建、数据模型、基础CRUD
- v0.2 五个AI Agent上线、分镜拆解、画面生成

### Phase 2: 视频与音频 (v0.3 - v0.5)

目标：完成从画面到视频的转化

- v0.3 视频生成模块（第七步）、核心资产管理
- v0.4 TTS配音合成（第八步）、多音色支持
- v0.5 成片合成（第九步）、字幕叠加、转场效果

### Phase 3: 成片与导出 (v0.6 - v0.7)

目标：完成从合成到交付

- v0.6 集数合并（第十步）、片头片尾、BGM
- v0.7 多格式导出（第十一步）、批量处理

### Phase 4: 体验优化 (v0.8 - v1.0)

目标：产品打磨、性能优化、正式发布

- v0.8 角色一致性引擎、场景资产管理
- v0.9 多语言支持、性能优化、错误处理
- v1.0 正式版发布、用户文档、API开放

## 部署信息

| 项目 | 详情 |
|------|------|
| 代码仓库 | https://github.com/liu183/ai-drama-duo |
| 在线地址 | https://ai-drama-duo.vercel.app |
| 部署平台 | Vercel (Edge Network) |
| 生产数据库 | PostgreSQL (Vercel Postgres) |
| AI推理 | NVIDIA NIM API |
| CI/CD | Git push to main → 自动构建部署 |

## License

Private - All Rights Reserved
