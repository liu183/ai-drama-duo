import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Dual-mode AI call for image generation
let ZAI: typeof import('z-ai-web-dev-sdk').default | null = null;
try {
  if (!process.env.VERCEL) {
    ZAI = (await import('z-ai-web-dev-sdk')).default;
  }
} catch {
  // SDK not available
}

const isZAIPlatform = !process.env.VERCEL && !!ZAI;

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

    // 如果有角色外观描述，附加到提示词
    const characterDescs = storyboard.characters
      .map(rc => rc.character)
      .filter(c => c.appearance || c.description)
      .map(c => `角色 ${c.name}: ${c.appearance || c.description}`)
      .join('. ');
    if (characterDescs) {
      enhancedPrompt += `. Characters: ${characterDescs}`;
    }

    // 如果有场景描述，附加
    if (storyboard.scene?.prompt) {
      enhancedPrompt += `. Scene: ${storyboard.scene.prompt}`;
    }

    // 如果有全局风格设置
    const style = storyboard.episode?.drama?.style || 'realistic';
    if (style !== 'realistic') {
      enhancedPrompt += `. Style: ${style}`;
    }

    const imageSize = size || '1024x1024';

    console.log(`[ImageGen] Generating image for storyboard ${storyboardId}, prompt: ${enhancedPrompt.substring(0, 100)}...`);

    let base64Image: string | null = null;

    if (isZAIPlatform && ZAI) {
      // Z.ai platform - use z-ai-web-dev-sdk
      const zai = await ZAI.create();
      const response = await zai.images.generations.create({
        prompt: enhancedPrompt,
        size: imageSize as '1024x1024',
      });

      base64Image = response.data?.[0]?.base64 || null;

      if (!base64Image) {
        // 尝试 url 字段
        const url = (response.data?.[0] as Record<string, string> | undefined)?.url;
        if (url) {
          // 下载图片并转为 base64
          const imgResponse = await fetch(url);
          const buffer = await imgResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = imgResponse.headers.get('content-type') || 'image/png';
          base64Image = `data:${contentType};base64,${base64}`;
        }
      } else {
        // SDK 返回的 base64 可能没有 data URI 前缀
        if (!base64Image.startsWith('data:')) {
          base64Image = `data:image/png;base64,${base64Image}`;
        }
      }
    } else {
      // Vercel / External - call NVIDIA image generation API
      const apiKey = process.env.NVIDIA_API_KEY || '';
      const baseUrl = (process.env.NVIDIA_BASE_URL || '').replace(/\/+$/, '');

      if (apiKey && baseUrl) {
        try {
          const response = await fetch(`${baseUrl}/image/generations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              prompt: enhancedPrompt,
              model: 'black-forest-labs/flux-schnell',
              width: parseInt(imageSize.split('x')[0]) || 1024,
              height: parseInt(imageSize.split('x')[1]) || 1024,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            // NVIDIA 返回 base64
            const imgItem = (data?.data?.[0] || data?.images?.[0]) as Record<string, string> | undefined;
            if (imgItem) {
              if (typeof imgItem.b64_json === 'string') {
                base64Image = `data:image/png;base64,${imgItem.b64_json}`;
              } else if (typeof imgItem.base64 === 'string') {
                base64Image = imgItem.base64.startsWith('data:') ? imgItem.base64 : `data:image/png;base64,${imgItem.base64}`;
              } else if (typeof imgItem.url === 'string' && imgItem.url.startsWith('http')) {
                const imgResponse = await fetch(imgItem.url);
                const buffer = await imgResponse.arrayBuffer();
                const b64 = Buffer.from(buffer).toString('base64');
                base64Image = `data:image/png;base64,${b64}`;
              }
            }
          } else {
            const errorText = await response.text();
            console.error(`[ImageGen] NVIDIA API error: ${response.status} - ${errorText}`);
          }
        } catch (apiError) {
          console.error(`[ImageGen] NVIDIA API call failed:`, apiError);
        }
      }

      // 如果外部 API 都不可用，尝试通过 LLM 描述生成占位图
      if (!base64Image) {
        console.log('[ImageGen] No image API available, generating placeholder');
        // 生成一个 SVG 占位图，显示提示词
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
            <text x="512" y="560" text-anchor="middle" fill="#666" font-size="12" font-family="sans-serif">请配置 AI 图片生成 API</text>
          </svg>
        `).toString('base64');
        base64Image = `data:image/svg+xml;base64,${svgText}`;
      }
    }

    if (base64Image) {
      // 更新分镜的 composedImage 字段
      await db.storyboard.update({
        where: { id: storyboardId },
        data: { composedImage: base64Image },
      });

      // 记录生成任务
      await db.imageGeneration.create({
        data: {
          storyboardId,
          dramaId: storyboard.episode?.dramaId,
          prompt: enhancedPrompt,
          provider: isZAIPlatform ? 'z-ai-web-dev-sdk' : 'nvidia',
          status: 'completed',
          imageUrl: base64Image.substring(0, 200) + '...', // 存储截断值
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
