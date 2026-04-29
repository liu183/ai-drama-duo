# AI Drama Duo - AI短剧创作平台

AI驱动的短剧全流程创作工具，从原始小说到成片导出，覆盖11步自动化流水线。

## 核心功能

- **AI改写** - 将小说/文本内容智能转换为短剧剧本格式
- **角色提取** - 自动识别剧本中的角色、外貌、性格特征
- **配音分配** - 基于角色性格自动匹配最佳配音风格
- **分镜拆解** - 将剧本拆解为逐镜头分镜，包含镜头语言、动作标注、氛围描述
- **画面生成** - 基于分镜提示词自动生成故事板画面，支持外部图片上传
- **视频生成** - 将故事板画面转化为视频片段（开发中）
- **配音合成** - TTS语音合成（规划中）
- **成片合成** - 视频+音频+字幕合成（规划中）
- **集数合并** - 多集合并管理（规划中）
- **导出完成** - 最终成片导出（规划中）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router) + React 19 |
| UI组件 | shadcn/ui + Radix UI + Tailwind CSS 4 |
| 动画 | Framer Motion |
| 数据库 | Prisma ORM + SQLite（本地）/ PostgreSQL（Vercel） |
| AI模型 | NVIDIA API (mixtral-8x22b-instruct) |
| 状态管理 | Zustand + React Query |
| 部署 | Vercel |

## 数据模型

- **Drama** - 短剧项目（标题、类型、风格、集数）
- **Episode** - 剧集（剧本内容、状态、配置）
- **Character** - 角色（外貌、性格、配音、参考图）
- **Scene** - 场景（地点、时间、氛围）
- **Storyboard** - 分镜（镜头、动作、提示词、画面、视频）
- **AiServiceConfig** - AI服务配置
- **AgentConfig** - Agent系统提示词与参数
- **ImageGeneration / VideoGeneration** - 生成任务记录

## 快速开始

```bash
# 安装依赖
bun install

# 数据库初始化
bun prisma db push
bun prisma generate

# 启动开发服务
bun run dev
```

## 环境变量

```env
DATABASE_URL=     # 数据库连接
NVIDIA_API_KEY=   # NVIDIA API 密钥
NVIDIA_BASE_URL=  # NVIDIA API 地址
NVIDIA_MODEL=     # 使用的模型名称
DIRECT_URL=       # Vercel 直连数据库地址
```

## 项目结构

```
src/
├── app/
│   ├── page.tsx              # 主入口（路由视图切换）
│   ├── layout.tsx            # 全局布局
│   ├── globals.css           # 全局样式
│   └── api/                  # API Routes
│       ├── dramas/           # 短剧 CRUD
│       ├── episodes/         # 剧集 CRUD
│       ├── characters/       # 角色 CRUD
│       ├── storyboards/      # 分镜 CRUD
│       ├── agent/            # AI Agent 调用
│       └── ...
├── components/
│   ├── drama-list.tsx        # 短剧列表
│   ├── drama-detail.tsx      # 短剧详情
│   ├── episode-studio.tsx    # 剧集工作室（11步流水线）
│   ├── settings-view.tsx     # AI配置设置
│   └── ui/                   # shadcn/ui 组件
├── lib/
│   ├── db.ts                 # 数据库双模式
│   ├── api.ts                # API 工具函数
│   └── utils.ts              # 通用工具
prisma/
├── schema.prisma             # SQLite Schema
└── schema.postgres.prisma    # PostgreSQL Schema
```

## 在线访问

https://ai-drama-duo.vercel.app
