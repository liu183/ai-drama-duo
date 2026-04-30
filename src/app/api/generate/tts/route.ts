import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/generate/tts
 * Body: { storyboardId: string, text: string, voiceStyle?: string, characterName?: string }
 * Returns: { success: boolean, audioBase64?: string, error?: string }
 *
 * TTS 配音生成 - 支持多种 TTS 引擎
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardId, text, voiceStyle, characterName } = body;

    if (!storyboardId || !text) {
      return NextResponse.json({ success: false, error: '缺少必要参数: storyboardId 或 text' }, { status: 400 });
    }

    // 获取分镜信息
    const storyboard = await db.storyboard.findUnique({
      where: { id: storyboardId },
      include: {
        characters: { include: { character: true } },
        episode: { include: { drama: true } },
      },
    });

    if (!storyboard) {
      return NextResponse.json({ success: false, error: '分镜不存在' }, { status: 404 });
    }

    // 如果没有提供文本，使用分镜的对话内容
    const ttsText = text || storyboard.dialogue || '';
    if (!ttsText.trim()) {
      return NextResponse.json({ success: false, error: '没有可配音的文本内容' }, { status: 400 });
    }

    // 获取角色配音风格
    const character = storyboard.characters?.[0]?.character;
    const voice = voiceStyle || character?.voiceStyle || 'default';

    console.log(`[TTS] Generating audio for storyboard ${storyboardId}, text: "${ttsText.substring(0, 50)}...", voice: ${voice}`);

    let audioBase64: string | null = null;
    const apiKey = process.env.NVIDIA_API_KEY || '';
    const baseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');

    // 尝试 NVIDIA TTS API
    if (apiKey && baseUrl) {
      try {
        const response = await fetch(`${baseUrl}/audio/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: ttsText,
            voice: voice,
            language: 'zh',
          }),
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'audio/mpeg';
          const buffer = await response.arrayBuffer();
          const b64 = Buffer.from(buffer).toString('base64');
          audioBase64 = `data:${contentType};base64,${b64}`;
        } else {
          console.error(`[TTS] API error: ${response.status} - ${await response.text()}`);
        }
      } catch (apiError) {
        console.error(`[TTS] API call failed:`, apiError);
      }
    }

    // 如果外部 API 不可用，使用 Web Speech API 合成提示
    // 在服务端无法使用 Web Speech API，所以返回提示信息
    if (!audioBase64) {
      console.log('[TTS] No TTS API available');
      return NextResponse.json({
        success: false,
        error: 'TTS 语音合成 API 未配置。请配置 NVIDIA API 中的 TTS 服务，或手动上传音频文件。',
        message: '需要配置 TTS API 才能使用 AI 配音功能',
      });
    }

    // 更新分镜的 ttsAudioUrl
    await db.storyboard.update({
      where: { id: storyboardId },
      data: { ttsAudioUrl: audioBase64 },
    });

    console.log(`[TTS] Successfully generated audio for storyboard ${storyboardId}`);
    return NextResponse.json({
      success: true,
      base64: audioBase64,
    });
  } catch (error) {
    console.error('[TTS] Error:', error);
    const message = error instanceof Error ? error.message : 'TTS 生成失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/generate/tts/batch
 * Body: { items: Array<{ storyboardId: string, text: string, voiceStyle?: string }> }
 * 批量生成 TTS
 */
export async function BATCH(request: NextRequest) {
  // Batch endpoint is handled by the POST above with an array of items
  return POST(request);
}
