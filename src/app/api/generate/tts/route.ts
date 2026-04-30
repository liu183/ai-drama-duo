import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateTTS } from '@/lib/ai-providers';

/**
 * POST /api/generate/tts
 * Body: { storyboardId: string, text: string, voiceStyle?: string, characterName?: string }
 * Returns: { success: boolean, audioBase64?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardId, text, voiceStyle, characterName } = body;

    if (!storyboardId || !text) {
      return NextResponse.json({ success: false, error: '缺少必要参数: storyboardId 或 text' }, { status: 400 });
    }

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

    const ttsText = text || storyboard.dialogue || '';
    if (!ttsText.trim()) {
      return NextResponse.json({ success: false, error: '没有可配音的文本内容' }, { status: 400 });
    }

    const character = storyboard.characters?.[0]?.character;
    const voice = voiceStyle || character?.voiceStyle || 'default';

    console.log(`[TTS] Generating audio for storyboard ${storyboardId}, text: "${ttsText.substring(0, 50)}...", voice: ${voice}`);

    let audioBase64: string | null = null;

    try {
      const result = await generateTTS({
        text: ttsText,
        voice,
        language: 'zh',
      });
      audioBase64 = result.base64;
    } catch (error) {
      console.error('[TTS] All providers failed:', (error as Error).message);
    }

    if (!audioBase64) {
      console.log('[TTS] No TTS API available');
      return NextResponse.json({
        success: false,
        error: 'TTS 语音合成服务不可用。请在设置页面配置语音合成供应商。',
        message: '需要配置 TTS 供应商才能使用 AI 配音功能',
      });
    }

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
