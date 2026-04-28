import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

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

    const validTypes = ['script_rewriter', 'extractor', 'storyboard_breaker', 'voice_assigner'];
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

    // Call LLM via z-ai-web-dev-sdk
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextMessage },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const result = completion.choices[0]?.message?.content || '';

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
                  duration: (sb.duration as number) || 10,
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
