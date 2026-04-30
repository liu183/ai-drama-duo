import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/generate/video
 * Body: { storyboardId: string, prompt: string, referenceImage?: string, motionScale?: number, cameraSpeed?: number }
 * Returns: { success: boolean, videoUrl?: string, base64?: string, taskId?: string, error?: string }
 *
 * 视频生成是耗时操作，支持两种模式：
 * 1. 同步模式（快速API）：等待结果返回
 * 2. 异步模式（任务队列）：提交任务，前端轮询状态
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardId, prompt, referenceImage, motionScale, cameraSpeed } = body;

    if (!storyboardId || !prompt) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    // 获取分镜信息
    const storyboard = await db.storyboard.findUnique({
      where: { id: storyboardId },
      include: {
        characters: { include: { character: true } },
        scene: true,
        episode: { include: { drama: true } },
      },
    });

    if (!storyboard) {
      return NextResponse.json({ success: false, error: '分镜不存在' }, { status: 404 });
    }

    // 构建增强提示词
    let enhancedPrompt = prompt;

    // 附加运动参数
    if (motionScale) {
      enhancedPrompt += `. Motion scale: ${motionScale}`;
    }
    if (cameraSpeed) {
      enhancedPrompt += `. Camera speed: ${cameraSpeed}`;
    }

    // 附加角色描述
    const characterDescs = storyboard.characters
      .map(rc => rc.character)
      .filter(c => c.appearance)
      .map(c => `${c.name}: ${c.appearance}`)
      .join(', ');
    if (characterDescs) {
      enhancedPrompt += `. Characters: ${characterDescs}`;
    }

    // 附加场景信息
    if (storyboard.scene?.prompt) {
      enhancedPrompt += `. Scene environment: ${storyboard.scene.prompt}`;
    }

    console.log(`[VideoGen] Starting video generation for storyboard ${storyboardId}`);

    // 创建生成任务记录
    const generationTask = await db.videoGeneration.create({
      data: {
        storyboardId,
        dramaId: storyboard.episode?.dramaId,
        prompt: enhancedPrompt,
        provider: process.env.NVIDIA_API_KEY ? 'nvidia' : 'placeholder',
        status: 'processing',
        referenceMode: referenceImage ? 'first_frame' : 'none',
        config: JSON.stringify({
          motionScale: motionScale || 1,
          cameraSpeed: cameraSpeed || 1,
          referenceImage: referenceImage ? 'provided' : 'none',
        }),
      },
    });

    // 尝试调用视频生成 API
    let videoBase64: string | null = null;
    const apiKey = process.env.NVIDIA_API_KEY || '';
    const baseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');

    if (apiKey && baseUrl) {
      try {
        // 尝试 NVIDIA 视频生成 API（如可灵/Kling）
        const requestBody: Record<string, unknown> = {
          prompt: enhancedPrompt,
        };

        // 如果有参考图片，附加为 first frame
        if (referenceImage && referenceImage.startsWith('data:')) {
          requestBody.image = referenceImage;
        }

        const response = await fetch(`${baseUrl}/video/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.video || data.output?.[0]) {
            const videoData = data.video || data.output?.[0];
            if (typeof videoData === 'string' && videoData.startsWith('data:')) {
              videoBase64 = videoData;
            } else if (typeof videoData === 'string' && videoData.startsWith('http')) {
              // 下载视频
              const videoResponse = await fetch(videoData);
              const buffer = await videoResponse.arrayBuffer();
              const b64 = Buffer.from(buffer).toString('base64');
              videoBase64 = `data:video/mp4;base64,${b64}`;
            } else if (videoData?.base64) {
              videoBase64 = `data:video/mp4;base64,${videoData.base64}`;
            }
          } else if (data.task_id || data.id) {
            // 异步任务模式 — 返回任务 ID 让前端轮询
            await db.videoGeneration.update({
              where: { id: generationTask.id },
              data: {
                status: 'pending',
                config: JSON.stringify({
                  ...JSON.parse(generationTask.config || '{}'),
                  externalTaskId: data.task_id || data.id,
                }),
              },
            });
            return NextResponse.json({
              success: true,
              taskId: generationTask.id,
              message: '视频生成任务已提交，请轮询状态',
            });
          }
        } else {
          console.error(`[VideoGen] API error: ${response.status} - ${await response.text()}`);
        }
      } catch (apiError) {
        console.error(`[VideoGen] API call failed:`, apiError);
      }
    }

    // 如果 API 不可用，生成占位视频（GIF-like 的 SVG 动画帧）
    if (!videoBase64) {
      console.log('[VideoGen] No video API available, generating placeholder');
      // 生成一个简短的占位标识
      await db.videoGeneration.update({
        where: { id: generationTask.id },
        data: {
          status: 'completed',
          videoUrl: 'placeholder://video-generation-pending',
        },
      });

      return NextResponse.json({
        success: false,
        taskId: generationTask.id,
        error: '视频生成 API 未配置。请在设置页面配置 NVIDIA API 或其他视频生成服务。',
        message: '需要配置视频生成 API 才能使用此功能',
      });
    }

    // 更新分镜和任务状态
    await db.storyboard.update({
      where: { id: storyboardId },
      data: { videoUrl: videoBase64 },
    });

    await db.videoGeneration.update({
      where: { id: generationTask.id },
      data: {
        status: 'completed',
        videoUrl: videoBase64.substring(0, 200) + '...',
      },
    });

    return NextResponse.json({
      success: true,
      base64: videoBase64,
    });
  } catch (error) {
    console.error('[VideoGen] Error:', error);
    const message = error instanceof Error ? error.message : '视频生成失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET /api/generate/video?taskId=xxx
 * 查询异步视频生成任务状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: '缺少 taskId 参数' }, { status: 400 });
    }

    const task = await db.videoGeneration.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: task.status === 'completed',
      status: task.status,
      videoUrl: task.videoUrl,
      error: task.status === 'failed' ? '视频生成失败' : undefined,
    });
  } catch (error) {
    console.error('[VideoGen] GET Error:', error);
    return NextResponse.json({ error: '查询任务状态失败' }, { status: 500 });
  }
}
