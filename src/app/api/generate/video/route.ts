import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateVideo } from '@/lib/ai-providers';

/**
 * POST /api/generate/video
 * Body: { storyboardId: string, prompt: string, referenceImage?: string, motionScale?: number, cameraSpeed?: number }
 * Returns: { success: boolean, videoUrl?: string, base64?: string, taskId?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardId, prompt, referenceImage, motionScale, cameraSpeed } = body;

    if (!storyboardId || !prompt) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

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

    let enhancedPrompt = prompt;
    if (motionScale) enhancedPrompt += `. Motion scale: ${motionScale}`;
    if (cameraSpeed) enhancedPrompt += `. Camera speed: ${cameraSpeed}`;

    const characterDescs = storyboard.characters
      .map(rc => rc.character)
      .filter(c => c.appearance)
      .map(c => `${c.name}: ${c.appearance}`)
      .join(', ');
    if (characterDescs) enhancedPrompt += `. Characters: ${characterDescs}`;

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
        provider: 'unified-provider',
        status: 'processing',
        referenceMode: referenceImage ? 'first_frame' : 'none',
        config: JSON.stringify({
          motionScale: motionScale || 1,
          cameraSpeed: cameraSpeed || 1,
          referenceImage: referenceImage ? 'provided' : 'none',
        }),
      },
    });

    // 使用统一供应商系统生成视频
    let videoResult;
    try {
      videoResult = await generateVideo({
        prompt: enhancedPrompt,
        referenceImage,
        motionScale,
        cameraSpeed,
      });
    } catch (error) {
      console.error('[VideoGen] All providers failed:', (error as Error).message);
    }

    if (!videoResult) {
      await db.videoGeneration.update({
        where: { id: generationTask.id },
        data: { status: 'completed', videoUrl: 'placeholder://video-generation-pending' },
      });
      return NextResponse.json({
        success: false,
        taskId: generationTask.id,
        error: '视频生成服务不可用。请在设置页面配置视频生成供应商。',
        message: '需要配置视频生成供应商才能使用此功能',
      });
    }

    if (videoResult.status === 'pending' && videoResult.taskId) {
      // 异步任务模式
      await db.videoGeneration.update({
        where: { id: generationTask.id },
        data: {
          status: 'pending',
          config: JSON.stringify({
            ...JSON.parse(generationTask.config || '{}'),
            externalTaskId: videoResult.taskId,
          }),
        },
      });
      return NextResponse.json({
        success: true,
        taskId: generationTask.id,
        message: '视频生成任务已提交，请轮询状态',
      });
    }

    if (videoResult.base64) {
      await db.storyboard.update({
        where: { id: storyboardId },
        data: { videoUrl: videoResult.base64 },
      });

      await db.videoGeneration.update({
        where: { id: generationTask.id },
        data: {
          status: 'completed',
          provider: videoResult.provider,
          videoUrl: videoResult.base64.substring(0, 200) + '...',
        },
      });

      return NextResponse.json({
        success: true,
        base64: videoResult.base64,
      });
    }

    return NextResponse.json({ success: false, error: '视频生成返回为空' }, { status: 500 });
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
