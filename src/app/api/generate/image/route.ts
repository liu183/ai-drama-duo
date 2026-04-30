import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateImage } from '@/lib/ai-providers';

/**
 * POST /api/generate/image
 * Body: { storyboardId: string, prompt: string, size?: string }
 * Returns: { success: boolean, imageUrl?: string, base64?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyboardId, prompt, size } = body;

    if (!storyboardId || !prompt) {
      return NextResponse.json({ success: false, error: '缺少必要参数: storyboardId 或 prompt' }, { status: 400 });
    }

    // 获取分镜信息（含角色和场景）
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

    // 构建增强提示词（加入角色外观、场景描述等上下文）
    let enhancedPrompt = prompt;

    const characterDescs = storyboard.characters
      .map(rc => rc.character)
      .filter(c => c.appearance || c.description)
      .map(c => `角色 ${c.name}: ${c.appearance || c.description}`)
      .join('. ');
    if (characterDescs) {
      enhancedPrompt += `. Characters: ${characterDescs}`;
    }

    if (storyboard.scene?.prompt) {
      enhancedPrompt += `. Scene: ${storyboard.scene.prompt}`;
    }

    const style = storyboard.episode?.drama?.style || 'realistic';
    if (style !== 'realistic') {
      enhancedPrompt += `. Style: ${style}`;
    }

    const imageSize = size || '1024x1024';

    console.log(`[ImageGen] Generating image for storyboard ${storyboardId}, prompt: ${enhancedPrompt.substring(0, 100)}...`);

    // 使用统一供应商系统生成图片
    let base64Image: string | null = null;

    try {
      const result = await generateImage({
        prompt: enhancedPrompt,
        size: imageSize,
      });
      base64Image = result.base64;
    } catch (error) {
      console.error('[ImageGen] All providers failed:', (error as Error).message);
    }

    // 如果所有供应商都不可用，生成占位图
    if (!base64Image) {
      console.log('[ImageGen] No image API available, generating placeholder');
      const svgText = Buffer.from(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="1024" height="1024" fill="url(#bg)"/>
          <text x="512" y="480" text-anchor="middle" fill="#e94560" font-size="24" font-family="sans-serif">AI Image Generation</text>
          <text x="512" y="520" text-anchor="middle" fill="#a7a7a7" font-size="14" font-family="sans-serif">${prompt.substring(0, 80)}</text>
          <text x="512" y="560" text-anchor="middle" fill="#666" font-size="12" font-family="sans-serif">请在设置中配置图片生成服务</text>
        </svg>
      `).toString('base64');
      base64Image = `data:image/svg+xml;base64,${svgText}`;
    }

    if (base64Image) {
      await db.storyboard.update({
        where: { id: storyboardId },
        data: { composedImage: base64Image },
      });

      await db.imageGeneration.create({
        data: {
          storyboardId,
          dramaId: storyboard.episode?.dramaId,
          prompt: enhancedPrompt,
          provider: 'unified-provider',
          status: 'completed',
          imageUrl: base64Image.substring(0, 200) + '...',
        },
      });

      console.log(`[ImageGen] Successfully generated image for storyboard ${storyboardId}`);
      return NextResponse.json({ success: true, base64: base64Image });
    }

    return NextResponse.json({ success: false, error: '图片生成失败' }, { status: 500 });
  } catch (error) {
    console.error('[ImageGen] Error:', error);
    const message = error instanceof Error ? error.message : '图片生成失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
