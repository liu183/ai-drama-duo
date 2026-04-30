import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/export - Export episode data in various formats
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { episodeId, format } = body;

    if (!episodeId || !format) {
      return NextResponse.json(
        { error: 'episodeId and format are required' },
        { status: 400 }
      );
    }

    const validFormats = ['srt', 'ass', 'json', 'script', 'storyboard_data', 'csv', 'prompt_list'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Supported: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    const episode = await fetchEpisodeData(episodeId);
    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    const result = generateExport(episode, format);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error exporting episode:', error);
    return NextResponse.json(
      { error: 'Export failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET /api/export?episodeId=xxx&format=srt - Download export file directly
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');
    const format = searchParams.get('format');

    if (!episodeId || !format) {
      return NextResponse.json(
        { error: 'episodeId and format are required' },
        { status: 400 }
      );
    }

    const episode = await fetchEpisodeData(episodeId);
    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    const result = generateExport(episode, format);

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(result.filename)}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting episode:', error);
    return NextResponse.json(
      { error: 'Export failed', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// ==================== Data Fetching ====================

async function fetchEpisodeData(episodeId: string) {
  return db.episode.findUnique({
    where: { id: episodeId },
    include: {
      storyboards: {
        orderBy: { storyboardNumber: 'asc' },
        include: {
          characters: { include: { character: true } },
          scene: true,
        },
      },
      characters: { include: { character: true } },
      drama: { select: { title: true } },
    },
  });
}

// ==================== Format Dispatch ====================

interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
}

function generateExport(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>, format: string): ExportResult {
  switch (format) {
    case 'srt':
      return generateSRT(episode);
    case 'ass':
      return generateASS(episode);
    case 'json':
      return generateJSON(episode);
    case 'script':
      return generateScript(episode);
    case 'storyboard_data':
      return generateStoryboardData(episode);
    case 'csv':
      return generateCSV(episode);
    case 'prompt_list':
      return generatePromptList(episode);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

// ==================== SRT Generator ====================

function generateSRT(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>): ExportResult {
  const lines: string[] = [];
  let subtitleIndex = 1;
  let currentTime = 0;

  lines.push('');
  lines.push(`# ${episode.drama?.title || '短剧'} - 第${episode.title ? ' ' + episode.title : ''}集`);
  lines.push(`# 字幕文件 (SRT)`);
  lines.push(`# 导出时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');

  for (const sb of episode.storyboards) {
    const startTime = formatSRTTime(currentTime);
    const endTime = formatSRTTime(currentTime + (sb.duration || 5));
    currentTime += sb.duration || 5;

    // Location/time subtitle
    if (sb.location || sb.time) {
      lines.push(`${subtitleIndex}`);
      lines.push(`${startTime} --> ${endTime}`);
      lines.push(`[${sb.location || ''}${sb.location && sb.time ? ' · ' : ''}${sb.time || ''}]`);
      lines.push('');
      subtitleIndex++;
    }

    // Dialogue subtitle
    if (sb.dialogue) {
      const charNames = sb.characters.map((c) => c.character.name).filter(Boolean);
      const speaker = charNames.length > 0 ? charNames.join(', ') : '';
      lines.push(`${subtitleIndex}`);
      lines.push(`${startTime} --> ${endTime}`);
      lines.push(speaker ? `${speaker}: ${sb.dialogue}` : sb.dialogue);
      lines.push('');
      subtitleIndex++;
    }

    // Description subtitle when no dialogue
    if (!sb.dialogue && sb.description) {
      lines.push(`${subtitleIndex}`);
      lines.push(`${startTime} --> ${endTime}`);
      lines.push(sb.description);
      lines.push('');
      subtitleIndex++;
    }
  }

  return {
    content: lines.join('\n'),
    filename: `第${episode.title || ''}集_字幕.srt`,
    mimeType: 'text/plain; charset=utf-8',
  };
}

// ==================== ASS Generator ====================

function generateASS(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>): ExportResult {
  const lines: string[] = [];
  let currentTime = 0;

  lines.push('[Script Info]');
  lines.push(`Title: ${episode.drama?.title || '短剧'} - ${episode.title || ''}`);
  lines.push('ScriptType: v4.00+');
  lines.push('PlayResX: 1920');
  lines.push('PlayResY: 1080');
  lines.push('WrapStyle: 0');
  lines.push('ScaledBorderAndShadow: yes');
  lines.push('');
  lines.push('[V4+ Styles]');
  lines.push('Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding');
  lines.push('Style: Default,Noto Sans SC,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,10,10,10,1');
  lines.push('Style: Speaker,Noto Sans SC,48,&H00FFFF00,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,8,10,10,10,1');
  lines.push('Style: Scene,Noto Sans SC,36,&H00CCCCCC,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,1,1,2,10,10,30,1');
  lines.push('');
  lines.push('[Events]');
  lines.push('Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text');

  for (const sb of episode.storyboards) {
    const startTime = formatASSTime(currentTime);
    const endTime = formatASSTime(currentTime + (sb.duration || 5));
    currentTime += sb.duration || 5;

    // Location/time subtitle
    if (sb.location || sb.time) {
      const text = `{\\an8}${sb.location || ''}${sb.location && sb.time ? ' · ' : ''}${sb.time || ''}`;
      lines.push(`Dialogue: 0,${startTime},${endTime},Scene,,0,0,0,,${text}`);
    }

    // Dialogue subtitle
    if (sb.dialogue) {
      const charNames = sb.characters.map((c) => c.character.name).filter(Boolean);
      const speaker = charNames.length > 0 ? `{\\c&H00FFFF&}${charNames.join(', ')}{\\c&H00FFFFFF&}: ` : '';
      lines.push(`Dialogue: 0,${startTime},${endTime},Speaker,,0,0,0,,${speaker}${sb.dialogue}`);
    }

    // Description subtitle
    if (!sb.dialogue && sb.description) {
      lines.push(`Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${sb.description}`);
    }
  }

  return {
    content: lines.join('\n'),
    filename: `第${episode.title || ''}集_字幕.ass`,
    mimeType: 'text/plain; charset=utf-8',
  };
}

// ==================== JSON Generator ====================

function generateJSON(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>): ExportResult {
  const exportData = {
    meta: {
      title: episode.drama?.title || '',
      episodeTitle: episode.title || '',
      duration: episode.duration,
      storyboardCount: episode.storyboards.length,
      characterCount: episode.characters.length,
      exportedAt: new Date().toISOString(),
    },
    characters: episode.characters.map((ec) => ({
      name: ec.character.name,
      role: ec.character.role,
      voiceStyle: ec.character.voiceStyle,
      voiceProvider: ec.character.voiceProvider,
      description: ec.character.description,
    })),
    storyboards: episode.storyboards.map((sb) => ({
      number: sb.storyboardNumber,
      title: sb.title,
      location: sb.location,
      time: sb.time,
      shotType: sb.shotType,
      angle: sb.angle,
      movement: sb.movement,
      action: sb.action,
      result: sb.result,
      atmosphere: sb.atmosphere,
      dialogue: sb.dialogue,
      description: sb.description,
      duration: sb.duration,
      characters: sb.characters.map((c) => c.character.name),
      imagePrompt: sb.imagePrompt,
      videoPrompt: sb.videoPrompt,
      bgmPrompt: sb.bgmPrompt,
      soundEffect: sb.soundEffect,
      hasImage: !!sb.composedImage,
      hasVideo: !!(sb.videoUrl || sb.composedVideoUrl),
      hasAudio: !!sb.ttsAudioUrl,
    })),
  };

  return {
    content: JSON.stringify(exportData, null, 2),
    filename: `第${episode.title || ''}集_数据.json`,
    mimeType: 'application/json; charset=utf-8',
  };
}

// ==================== Script Generator ====================

function generateScript(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>): ExportResult {
  const lines: string[] = [];

  lines.push('='.repeat(50));
  lines.push(`${episode.drama?.title || '短剧'} - 第${episode.title || ''}集`);
  lines.push('='.repeat(50));
  lines.push('');

  if (episode.scriptContent) {
    lines.push('【剧本正文】');
    lines.push('-'.repeat(30));
    lines.push(episode.scriptContent);
    lines.push('');
  }

  lines.push('【分镜脚本】');
  lines.push('-'.repeat(30));
  lines.push('');

  for (const sb of episode.storyboards) {
    lines.push(`[分镜 #${sb.storyboardNumber}] ${sb.title || ''}`);

    if (sb.location || sb.time) {
      lines.push(`  场景: ${sb.location || '未指定'} | 时间: ${sb.time || '未指定'}`);
    }

    if (sb.shotType) {
      lines.push(`  景别: ${sb.shotType}`);
    }

    if (sb.angle) {
      lines.push(`  角度: ${sb.angle}`);
    }

    if (sb.characters.length > 0) {
      lines.push(`  出场角色: ${sb.characters.map((c) => c.character.name).join(', ')}`);
    }

    if (sb.action) {
      lines.push(`  动作: ${sb.action}`);
    }

    if (sb.dialogue) {
      const charNames = sb.characters.map((c) => c.character.name).filter(Boolean);
      const speaker = charNames.length > 0 ? charNames.join('/') + ': ' : '';
      lines.push(`  对话: ${speaker}${sb.dialogue}`);
    }

    if (sb.description) {
      lines.push(`  描述: ${sb.description}`);
    }

    if (sb.atmosphere) {
      lines.push(`  氛围: ${sb.atmosphere}`);
    }

    lines.push(`  时长: ${sb.duration || 5}秒`);
    lines.push('');
  }

  lines.push('='.repeat(50));
  lines.push(`总分镜数: ${episode.storyboards.length}`);
  lines.push(`总时长: ${episode.storyboards.reduce((sum, sb) => sum + (sb.duration || 0), 0)}秒`);
  lines.push(`导出时间: ${new Date().toLocaleString('zh-CN')}`);

  return {
    content: lines.join('\n'),
    filename: `第${episode.title || ''}集_剧本.txt`,
    mimeType: 'text/plain; charset=utf-8',
  };
}

// ==================== Storyboard Data Generator ====================

function generateStoryboardData(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>): ExportResult {
  const lines: string[] = [];

  lines.push(`# ${episode.drama?.title || '短剧'} - 第${episode.title || ''}集 - 分镜数据`);
  lines.push(`# 导出时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');
  lines.push(`# 格式: 分镜编号 | 标题 | 画面提示词 | 视频提示词`);
  lines.push('');

  for (const sb of episode.storyboards) {
    lines.push(`--- 分镜 #${sb.storyboardNumber} ---`);
    lines.push(`标题: ${sb.title || '未命名'}`);
    lines.push(`场景: ${sb.location || '未指定'} (${sb.time || '未指定'})`);
    lines.push(`时长: ${sb.duration || 5}秒`);
    lines.push('');

    if (sb.imagePrompt) {
      lines.push('[画面提示词]');
      lines.push(sb.imagePrompt);
      lines.push('');
    }

    if (sb.videoPrompt) {
      lines.push('[视频提示词]');
      lines.push(sb.videoPrompt);
      lines.push('');
    }

    if (sb.dialogue) {
      const charNames = sb.characters.map((c) => c.character.name).filter(Boolean);
      lines.push(`[对话] ${charNames.length > 0 ? charNames.join(', ') + ': ' : ''}${sb.dialogue}`);
      lines.push('');
    }

    if (sb.bgmPrompt) {
      lines.push(`[背景音乐] ${sb.bgmPrompt}`);
      lines.push('');
    }

    if (sb.soundEffect) {
      lines.push(`[音效] ${sb.soundEffect}`);
      lines.push('');
    }

    lines.push('');
  }

  return {
    content: lines.join('\n'),
    filename: `第${episode.title || ''}集_分镜数据.txt`,
    mimeType: 'text/plain; charset=utf-8',
  };
}

// ==================== Time Formatting ====================

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${String(h).padStart(1, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// ==================== CSV Generator ====================

function generateCSV(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>): ExportResult {
  const lines: string[] = [];

  // BOM for Excel UTF-8 support
  lines.push('\uFEFF');

  // Header
  lines.push([
    '分镜编号', '标题', '场景', '时间', '景别', '角度', '运镜', '动作',
    '对话', '描述', '氛围', '时长(秒)', '出场角色', '画面提示词', '视频提示词',
    '背景音乐', '音效', '有画面', '有视频', '有配音',
  ].join(','));

  for (const sb of episode.storyboards) {
    const charNames = sb.characters.map((c) => c.character.name).filter(Boolean).join(';');
    const row = [
      sb.storyboardNumber,
      escapeCSV(sb.title || ''),
      escapeCSV(sb.location || ''),
      escapeCSV(sb.time || ''),
      escapeCSV(sb.shotType || ''),
      escapeCSV(sb.angle || ''),
      escapeCSV(sb.movement || ''),
      escapeCSV(sb.action || ''),
      escapeCSV(sb.dialogue || ''),
      escapeCSV(sb.description || ''),
      escapeCSV(sb.atmosphere || ''),
      sb.duration || 5,
      escapeCSV(charNames),
      escapeCSV(sb.imagePrompt || ''),
      escapeCSV(sb.videoPrompt || ''),
      escapeCSV(sb.bgmPrompt || ''),
      escapeCSV(sb.soundEffect || ''),
      sb.composedImage ? '是' : '否',
      (sb.videoUrl || sb.composedVideoUrl) ? '是' : '否',
      sb.ttsAudioUrl ? '是' : '否',
    ].join(',');
    lines.push(row);
  }

  return {
    content: lines.join('\n'),
    filename: `第${episode.title || ''}集_分镜表.csv`,
    mimeType: 'text/csv; charset=utf-8',
  };
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ==================== Prompt List Generator ====================
// 导出纯文本提示词列表，方便批量使用于 AI 图片/视频生成工具

function generatePromptList(episode: NonNullable<Awaited<ReturnType<typeof fetchEpisodeData>>>): ExportResult {
  const lines: string[] = [];

  lines.push(`# ${episode.drama?.title || '短剧'} - 第${episode.title || ''}集`);
  lines.push(`# AI 提示词列表`);
  lines.push(`# 导出时间: ${new Date().toLocaleString('zh-CN')}`);
  lines.push('');

  // Image prompts section
  lines.push('## 画面生成提示词 (Image Prompts)');
  lines.push('');
  let hasImagePrompts = false;
  for (const sb of episode.storyboards) {
    if (sb.imagePrompt) {
      hasImagePrompts = true;
      const charNames = sb.characters.map((c) => c.character.name).filter(Boolean);
      lines.push(`### 分镜 #${sb.storyboardNumber}: ${sb.title || '未命名'}`);
      if (charNames.length > 0) {
        lines.push(`角色: ${charNames.join(', ')}`);
      }
      if (sb.location || sb.time) {
        lines.push(`场景: ${sb.location || ''} (${sb.time || ''})`);
      }
      lines.push('');
      lines.push(sb.imagePrompt);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }
  if (!hasImagePrompts) {
    lines.push('(暂无画面提示词，请先在第6步生成)');
    lines.push('');
  }

  // Video prompts section
  lines.push('## 视频生成提示词 (Video Prompts)');
  lines.push('');
  let hasVideoPrompts = false;
  for (const sb of episode.storyboards) {
    if (sb.videoPrompt) {
      hasVideoPrompts = true;
      lines.push(`### 分镜 #${sb.storyboardNumber}: ${sb.title || '未命名'}`);
      lines.push(`参考画面: ${sb.composedImage ? '已有' : '未生成'}`);
      lines.push('');
      lines.push(sb.videoPrompt);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }
  if (!hasVideoPrompts) {
    lines.push('(暂无视频提示词，请先在第7步生成)');
    lines.push('');
  }

  // Dialogue list for TTS
  lines.push('## 配音文本列表 (TTS Text)');
  lines.push('');
  let hasDialogue = false;
  for (const sb of episode.storyboards) {
    if (sb.dialogue) {
      hasDialogue = true;
      const charNames = sb.characters.map((c) => c.character.name).filter(Boolean);
      const voiceStyle = sb.characters[0]?.character?.voiceStyle || '';
      lines.push(`[分镜#${sb.storyboardNumber}] ${charNames.length > 0 ? charNames.join('/') + ': ' : ''}${sb.dialogue}`);
      if (voiceStyle) {
        lines.push(`  配音风格: ${voiceStyle}`);
      }
      lines.push(`  时长: ${sb.duration || 5}秒`);
      lines.push('');
    }
  }
  if (!hasDialogue) {
    lines.push('(暂无对话内容)');
  }

  return {
    content: lines.join('\n'),
    filename: `第${episode.title || ''}集_AI提示词.md`,
    mimeType: 'text/markdown; charset=utf-8',
  };
}
