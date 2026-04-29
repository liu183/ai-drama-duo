import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Dual-mode AI call:
// - Z.ai platform (has /etc/.z-ai-config): use z-ai-web-dev-sdk
// - Vercel / external (has NVIDIA_* env vars): call NVIDIA API directly via fetch
let ZAI: typeof import('z-ai-web-dev-sdk').default | null = null;
try {
  // Only import SDK if we're NOT on Vercel (avoids config file issues)
  if (!process.env.VERCEL) {
    ZAI = (await import('z-ai-web-dev-sdk')).default;
  }
} catch {
  // SDK not available, will use direct API calls
}

const isZAIPlatform = !process.env.VERCEL && !!ZAI;

/**
 * Call LLM - returns the assistant message content
 */
async function callLLM(options: {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  if (isZAIPlatform && ZAI) {
    // Mode 1: Z.ai platform - use z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userMessage },
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    return completion.choices?.[0]?.message?.content || '';
  }

  // Mode 2: Vercel / External - call NVIDIA API directly
  const baseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.NVIDIA_API_KEY || '';
  const model = options.model || process.env.NVIDIA_MODEL || 'nvidia/llama-3.1-nemotron-70b-instruct';

  if (!baseUrl || !apiKey) {
    throw new Error('AI configuration missing. Set NVIDIA_BASE_URL and NVIDIA_API_KEY environment variables.');
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
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userMessage },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`NVIDIA API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Helper: Extract JSON from LLM response (handles markdown code blocks)
function extractJSON(text: string): unknown[] | null {
  // Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // continue
  }

  // Try to extract from markdown code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // continue
    }
  }

  // Try to find JSON array in the text
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // continue
    }
  }

  // Try to find JSON object
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (Array.isArray(parsed)) return parsed;
      return [parsed]; // wrap single object in array
    } catch {
      // continue
    }
  }

  return null;
}

// Helper: Extract characters JSON and scenes JSON from LLM response
function extractCharactersAndScenes(text: string): { characters: unknown[]; scenes: unknown[] } {
  // Try to find two separate JSON arrays
  const allArrays = text.match(/\[[\s\S]*?\]/g);
  if (allArrays && allArrays.length >= 2) {
    let characters: unknown[] = [];
    let scenes: unknown[] = [];
    for (const arr of allArrays) {
      try {
        const parsed = JSON.parse(arr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0] as Record<string, unknown>;
          if ('name' in first && ('role' in first || 'description' in first)) {
            characters = parsed;
          } else if ('location' in first || 'prompt' in first) {
            scenes = parsed;
          }
        }
      } catch {
        // continue
      }
    }
    if (characters.length > 0 || scenes.length > 0) {
      return { characters, scenes };
    }
  }

  // Fallback: try to find labeled sections
  const charactersMatch = text.match(/角色[：:]\s*\n?\s*```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const scenesMatch = text.match(/场景[：:]\s*\n?\s*```(?:json)?\s*\n?([\s\S]*?)\n?```/);

  let characters: unknown[] = [];
  let scenes: unknown[] = [];

  if (charactersMatch) {
    try {
      characters = JSON.parse(charactersMatch[1].trim());
    } catch {
      // continue
    }
  }
  if (scenesMatch) {
    try {
      scenes = JSON.parse(scenesMatch[1].trim());
    } catch {
      // continue
    }
  }

  if (characters.length > 0 || scenes.length > 0) {
    return { characters, scenes };
  }

  // Final fallback: extract any JSON arrays
  const extracted = extractJSON(text);
  if (extracted) {
    const first = extracted[0] as Record<string, unknown>;
    if ('name' in first && 'role' in first) {
      characters = extracted;
    } else if ('location' in first) {
      scenes = extracted;
    }
  }

  return { characters, scenes };
}

// System prompts for each agent type
const AGENT_PROMPTS: Record<string, string> = {
  script_rewriter: `你是一位专业的短剧编剧。你的任务是将用户提供的小说/故事文本转换为格式化的短剧剧本。
输出格式要求：
- 场景标题用【场景名】标注
- 动作描述直接写在行中
- 对话格式：角色名：台词内容
- 每个场景之间用空行分隔
- 保持原文的故事情节和人物性格
- 适当删减冗余描写，保留关键对话和动作`,

  extractor: `你是一位专业的短剧角色和场景分析专家。请从剧本中提取所有角色和场景信息。
角色提取格式（JSON数组）：
[{"name":"角色名","role":"主角/配角/群演","description":"角色描述","appearance":"外貌描述","personality":"性格特点"}]
场景提取格式（JSON数组）：
[{"location":"地点","time":"时间","prompt":"场景AI绘图提示词（英文）"}]
请确保角色名与剧本中一致，去重处理。`,

  storyboard_breaker: `你是一位专业的短剧分镜师。请将剧本拆分为详细的分镜列表。
每个分镜需要包含：
1. 场景编号和标题
2. 场景地点和时间
3. 镜头类型（特写/中景/远景/全景/移动镜头）
4. 镜头角度（平视/俯视/仰视）
5. 镜头运动（固定/推进/拉远/跟随/环绕）
6. 动作描述
7. 角色台词
8. 氛围描述
9. 每个镜头时长（10-15秒）

输出格式为JSON数组，每个元素包含以上所有字段。`,

  voice_assigner: `你是一位专业的配音导演。请根据角色的性格、年龄、性别等特征，为每个角色推荐合适的配音风格。
可用配音风格：温柔女声/霸道男声/少女音/正太音/御姐音/大叔音/清冷女声/沙哑男声/磁性男声/甜美女声
输出格式（JSON数组）：[{"name":"角色名","voiceStyle":"配音风格","voiceProvider":"default"}]`,

  image_prompt_generator: `你是一位专业的AI画面提示词专家。你需要为每个分镜生成高质量的画面提示词。

你会收到以下信息：
1. 【全局风格配置】- 包括画面比例、质量关键词、风格前缀、排除项
2. 【角色设定】- 每个角色的英文外貌描述、种子值、参考图信息
3. 【场景设定】- 每个场景的英文环境描述
4. 【分镜列表】- 每个分镜的具体内容（地点、动作、台词、氛围等）
5. 【角色出场信息】- 每个分镜中出场的角色

生成要求：
1. 提示词必须以全局风格前缀开头
2. 包含出场角色的外貌描述（必须使用角色设定中提供的英文描述，保持一致性）
3. 包含场景环境描述（必须使用场景设定中提供的英文描述）
4. 描述角色在当前场景中的具体动作和表情
5. 如果角色有种子值，在提示词末尾添加 "--seed {seedValue}"
6. 每个提示词80-120个英文单词
7. 在提示词末尾加上质量关键词（排除项不要写在提示词中，单独在negativePrompt字段中）
8. 保持人物外貌和服装在不同分镜间完全一致

输出格式为JSON数组：
[{"storyboardNumber":1,"imagePrompt":"cinematic shot, ...","negativePrompt":"blurry, low quality..."}]`,
};

// POST /api/agent - Run an AI agent task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentType,
      dramaId,
      episodeId,
      message,
    } = body;

    // Validate required fields
    if (!agentType || !dramaId || !message) {
      return NextResponse.json(
        { error: 'agentType, dramaId, and message are required' },
        { status: 400 }
      );
    }

    const validTypes = ['script_rewriter', 'extractor', 'storyboard_breaker', 'voice_assigner', 'image_prompt_generator'];
    if (!validTypes.includes(agentType)) {
      return NextResponse.json(
        { error: `Invalid agentType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Check drama exists
    const drama = await db.drama.findUnique({
      where: { id: dramaId, deletedAt: null },
    });
    if (!drama) {
      return NextResponse.json(
        { error: 'Drama not found' },
        { status: 404 }
      );
    }

    // Build context based on agentType
    let contextMessage = message;

    // script_rewriter: load raw novel content for rewriting
    if (agentType === 'script_rewriter' && episodeId) {
      const episode = await db.episode.findUnique({
        where: { id: episodeId },
        select: { content: true, title: true },
      });
      if (episode && episode.content) {
        contextMessage = `小说标题：${episode.title}\n\n小说原文内容：\n${episode.content}\n\n${message || '请将以上小说内容改写为短剧剧本格式。'}`;
      } else {
        return NextResponse.json(
          { error: '该集数还没有原始内容，请先在第1步输入并保存小说原文' },
          { status: 400 }
        );
      }
    }

    // extractor / storyboard_breaker / voice_assigner: load script content for analysis
    if (agentType === 'extractor' || agentType === 'storyboard_breaker' || agentType === 'voice_assigner') {
      if (episodeId) {
        const episode = await db.episode.findUnique({
          where: { id: episodeId },
          select: { scriptContent: true, content: true, title: true },
        });
        if (episode) {
          const scriptContent = episode.scriptContent || episode.content;
          if (scriptContent) {
            contextMessage = `剧本标题：${episode.title}\n\n剧本内容：\n${scriptContent}\n\n${message || '请按要求分析以上剧本。'}`;
          }
        }
      }
    }

    // image_prompt_generator: load storyboards, characters, scenes, and style config for prompt generation
    if (agentType === 'image_prompt_generator') {
      if (episodeId) {
        // Load storyboards with character associations
        const storyboards = await db.storyboard.findMany({
          where: { episodeId },
          orderBy: { storyboardNumber: 'asc' },
          select: {
            storyboardNumber: true,
            title: true,
            location: true,
            time: true,
            shotType: true,
            angle: true,
            action: true,
            atmosphere: true,
            dialogue: true,
            description: true,
            sceneId: true,
            characters: {
              select: {
                character: {
                  select: { id: true, name: true, appearance: true, seedValue: true, imageUrl: true, referenceImages: true },
                },
              },
            },
          },
        });

        if (storyboards.length === 0) {
          return NextResponse.json(
            { error: '该集数还没有分镜数据，请先在第5步生成分镜' },
            { status: 400 }
          );
        }

        // Load drama metadata for global style config
        const dramaWithMeta = await db.drama.findUnique({
          where: { id: dramaId },
          select: { metadata: true, style: true },
        });

        // Parse style config
        let styleConfig = {
          aspectRatio: '16:9',
          qualityKeywords: '8K UHD, masterpiece, best quality, ultra detailed',
          negativePrompts: 'blurry, low quality, watermark, text, distorted face, extra fingers',
          stylePromptPrefix: 'cinematic, dramatic lighting, film grain, shallow depth of field',
        };
        if (dramaWithMeta?.metadata) {
          try {
            const meta = JSON.parse(dramaWithMeta.metadata);
            if (meta.imageStyle) {
              styleConfig = { ...styleConfig, ...meta.imageStyle };
            }
          } catch { /* ignore */ }
        }

        // Load all characters for this drama
        const allCharacters = await db.character.findMany({
          where: { dramaId },
          select: { id: true, name: true, appearance: true, seedValue: true, imageUrl: true, referenceImages: true },
        });

        // Load all scenes for this drama
        const allScenes = await db.scene.findMany({
          where: { dramaId },
          select: { id: true, location: true, prompt: true, imageUrl: true },
        });

        // Build character context
        function parseCharAppearance(raw: string): { text?: string; promptEn?: string } {
          if (!raw) return {};
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
            return { text: raw };
          } catch {
            return { text: raw };
          }
        }

        function parseScenePrompt(raw: string): { text?: string; promptEn?: string } {
          if (!raw) return {};
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
            return { text: raw };
          } catch {
            return { text: raw };
          }
        }

        const characterContext = allCharacters.map(c => {
          const app = parseCharAppearance(c.appearance);
          const hasRef = !!c.imageUrl || (c.referenceImages && JSON.parse(c.referenceImages || '[]').length > 0);
          return `角色名: ${c.name}
- 英文描述: ${app.promptEn || app.text || '无'}
- 种子值: ${c.seedValue || '未设置'}
- 参考图: ${hasRef ? '已提供参考图' : '无'}`;
        }).join('\n\n');

        // Build scene context
        const sceneContext = allScenes.map(s => {
          const sp = parseScenePrompt(s.prompt);
          return `场景: ${s.location}
- 英文描述: ${sp.promptEn || sp.text || '无'}
- 参考图: ${s.imageUrl ? '已提供参考图' : '无'}`;
        }).join('\n\n');

        // Build storyboard context with character associations
        const sbInfo = storyboards.map(sb => {
          const charNames = sb.characters.map(sc => sc.character.name).join(', ');
          const sbLocation = sb.location || '';
          return `分镜#${sb.storyboardNumber} "${sb.title || ''}"
  地点: ${sbLocation} | 时间: ${sb.time} | 镜头: ${sb.shotType} | 角度: ${sb.angle}
  动作: ${sb.action} | 氛围: ${sb.atmosphere}
  台词: ${sb.dialogue} | 描述: ${sb.description}
  出场角色: ${charNames || '无'}
  场景ID: ${sb.sceneId || '未关联'}`;
        }).join('\n---\n');

        contextMessage = `【全局风格】
- 画面比例: ${styleConfig.aspectRatio}
- 质量关键词: ${styleConfig.qualityKeywords}
- 风格前缀: ${styleConfig.stylePromptPrefix}
- 排除项: ${styleConfig.negativePrompts}

【角色设定】
${characterContext || '暂无角色设定'}

【场景设定】
${sceneContext || '暂无场景设定'}

【分镜列表】共${storyboards.length}个分镜
${sbInfo}

${message || '请根据以上全局风格、角色设定、场景设定，为每个分镜生成英文画面提示词。'}
        `;
      }
    }

    if (agentType === 'voice_assigner') {
      const characters = await db.character.findMany({
        where: { dramaId },
        select: { name: true, role: true, description: true, personality: true },
      });
      if (characters.length > 0) {
        const characterInfo = characters
          .map(c => `角色名: ${c.name}, 角色: ${c.role}, 描述: ${c.description}, 性格: ${c.personality}`)
          .join('\n');
        contextMessage = `角色列表：\n${characterInfo}\n\n${message || '请为以上角色分配配音风格。'}`;
      }
    }

    // Get agent config (or use defaults)
    const agentConfig = await db.agentConfig.findUnique({
      where: { agentType },
    });

    const systemPrompt = agentConfig?.systemPrompt || AGENT_PROMPTS[agentType];
    const temperature = agentConfig?.temperature ?? 0.7;
    const maxTokens = agentConfig?.maxTokens ?? 4096;

    // Call LLM (auto-selects Z.ai SDK or NVIDIA API based on environment)
    const result = await callLLM({
      systemPrompt,
      userMessage: contextMessage,
      temperature,
      maxTokens: maxTokens,
    });

    // Save agent chat log
    const chatLog = await db.agentChatLog.create({
      data: {
        dramaId,
        episodeId: episodeId || null,
        agentType,
        input: message,
        output: result,
        status: 'completed',
      },
    });

    // Process result based on agentType
    let processedResult: Record<string, unknown> | null = null;

    switch (agentType) {
      case 'script_rewriter': {
        if (episodeId) {
          await db.episode.update({
            where: { id: episodeId },
            data: {
              scriptContent: result,
              status: 'scripted',
            },
          });
          processedResult = { episodeId, scriptContent: result };
        }
        break;
      }

      case 'extractor': {
        const { characters: extractedCharacters, scenes: extractedScenes } =
          extractCharactersAndScenes(result);

        // Save characters
        if (extractedCharacters.length > 0) {
          const roleOrder: Record<string, number> = {
            '主角': 0, '配角': 10, '群演': 20,
          };

          await db.$transaction(
            extractedCharacters.map((char: Record<string, unknown>, index: number) => {
              const roleName = (char.role as string) || '配角';
              return db.character.create({
                data: {
                  dramaId,
                  name: (char.name as string)?.trim() || `角色${index + 1}`,
                  role: roleName,
                  description: (char.description as string) || '',
                  appearance: (char.appearance as string) || '',
                  personality: (char.personality as string) || '',
                  sortOrder: (roleOrder[roleName] ?? 10) + index,
                },
              });
            })
          );
        }

        // Save scenes
        if (extractedScenes.length > 0) {
          await db.$transaction(
            extractedScenes.map((scene: Record<string, unknown>) => {
              return db.scene.create({
                data: {
                  dramaId,
                  episodeId: episodeId || null,
                  location: (scene.location as string) || '',
                  time: (scene.time as string) || '',
                  prompt: (scene.prompt as string) || '',
                },
              });
            })
          );
        }

        processedResult = {
          charactersCount: extractedCharacters.length,
          scenesCount: extractedScenes.length,
          characters: extractedCharacters,
          scenes: extractedScenes,
        };
        break;
      }

      case 'storyboard_breaker': {
        const storyboards = extractJSON(result);
        if (storyboards && storyboards.length > 0 && episodeId) {
          // Delete existing storyboards for this episode
          await db.storyboard.deleteMany({
            where: { episodeId },
          });

          // Create new storyboards
          const created = await db.$transaction(
            storyboards.map((sb: Record<string, unknown>, index: number) => {
              return db.storyboard.create({
                data: {
                  episodeId,
                  storyboardNumber: (sb.storyboardNumber as number) || (index + 1),
                  title: (sb.title as string) || `分镜${index + 1}`,
                  location: (sb.location as string) || '',
                  time: (sb.time as string) || '',
                  shotType: (sb.shotType as string) || '',
                  angle: (sb.angle as string) || '',
                  movement: (sb.movement as string) || '',
                  action: (sb.action as string) || '',
                  result: (sb.result as string) || '',
                  atmosphere: (sb.atmosphere as string) || '',
                  dialogue: (sb.dialogue as string) || '',
                  description: (sb.description as string) || '',
                  duration: parseFloat(String(sb.duration)) || 10,
                  status: 'pending',
                },
              });
            })
          );

          processedResult = {
            storyboardsCount: created.length,
            storyboards: created,
          };
        } else {
          processedResult = { rawResult: result, storyboardsCount: 0 };
        }
        break;
      }

      case 'voice_assigner': {
        const voiceAssignments = extractJSON(result);
        if (voiceAssignments && voiceAssignments.length > 0) {
          const updateResults = await Promise.all(
            voiceAssignments.map(async (va: Record<string, unknown>) => {
              const name = (va.name as string)?.trim();
              if (!name) return null;

              return db.character.updateMany({
                where: { dramaId, name },
                data: {
                  voiceStyle: (va.voiceStyle as string) || '',
                  voiceProvider: (va.voiceProvider as string) || 'default',
                },
              });
            })
          );

          processedResult = {
            updatedCount: updateResults.filter(Boolean).length,
            assignments: voiceAssignments,
          };
        } else {
          processedResult = { rawResult: result, updatedCount: 0 };
        }
        break;
      }

      case 'image_prompt_generator': {
        // Parse the returned prompts and save to storyboards
        const prompts = extractJSON(result);
        if (prompts && prompts.length > 0 && episodeId) {
          const updateResults = await Promise.all(
            prompts.map(async (p: Record<string, unknown>) => {
              const sbNum = p.storyboardNumber as number;
              const prompt = (p.imagePrompt as string) || '';
              if (!sbNum || !prompt) return null;

              return db.storyboard.updateMany({
                where: { episodeId, storyboardNumber: sbNum },
                data: { imagePrompt: prompt },
              });
            })
          );

          processedResult = {
            updatedCount: updateResults.filter(Boolean).length,
            prompts,
          };
        } else {
          processedResult = { rawResult: result, updatedCount: 0 };
        }
        break;
      }
    }

    return NextResponse.json({
      data: {
        chatLogId: chatLog.id,
        agentType,
        result,
        processed: processedResult,
      },
    });
  } catch (error) {
    console.error('Error running agent task:', error);

    // Save error to chat log if we have the required fields
    try {
      if (body.agentType && body.dramaId) {
        await db.agentChatLog.create({
          data: {
            dramaId: body.dramaId,
            episodeId: body.episodeId || null,
            agentType: body.agentType,
            input: body.message || '',
            output: `Error: ${(error as Error).message}`,
            status: 'failed',
          },
        });
      }
    } catch {
      // Ignore log save errors
    }

    return NextResponse.json(
      { error: 'Failed to run agent task', message: (error as Error).message },
      { status: 500 }
    );
  }
}
