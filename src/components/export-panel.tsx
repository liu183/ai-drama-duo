'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  FileJson,
  Subtitles,
  Image,
  Package,
  Check,
  Loader2,
  Eye,
  AlertCircle,
  Film,
  Clock,
  Table,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { exportApi } from '@/lib/api';

// ==================== Types ====================
interface ExportPanelProps {
  storyboards: {
    id: string;
    storyboardNumber: number;
    title: string;
    duration: number;
    dialogue: string;
    imagePrompt: string;
    videoPrompt: string;
    composedImage: string;
    videoUrl: string;
    composedVideoUrl: string;
    ttsAudioUrl: string;
  }[];
  episodeId: string;
  episodeTitle: string;
  dramaTitle: string;
  duration: number;
  status: string;
}

interface ExportFormat {
  key: string;
  label: string;
  description: string;
  icon: typeof FileText;
  extension: string;
  mimeType: string;
  category: 'subtitle' | 'data' | 'script' | 'media';
}

// ==================== Export Formats ====================
const EXPORT_FORMATS: ExportFormat[] = [
  {
    key: 'srt',
    label: 'SRT 字幕',
    description: '标准字幕格式，适用于大多数播放器',
    icon: Subtitles,
    extension: '.srt',
    mimeType: 'text/plain',
    category: 'subtitle',
  },
  {
    key: 'ass',
    label: 'ASS 字幕',
    description: '高级字幕格式，支持样式和特效',
    icon: Subtitles,
    extension: '.ass',
    mimeType: 'text/plain',
    category: 'subtitle',
  },
  {
    key: 'json',
    label: 'JSON 数据',
    description: '结构化数据，便于程序处理和二次开发',
    icon: FileJson,
    extension: '.json',
    mimeType: 'application/json',
    category: 'data',
  },
  {
    key: 'script',
    label: '剧本文件',
    description: '完整剧本+分镜脚本文本格式',
    icon: FileText,
    extension: '.txt',
    mimeType: 'text/plain',
    category: 'script',
  },
  {
    key: 'storyboard_data',
    label: '分镜数据',
    description: '包含所有提示词的分镜数据文件',
    icon: Image,
    extension: '.txt',
    mimeType: 'text/plain',
    category: 'data',
  },
  {
    key: 'csv',
    label: 'CSV 分镜表',
    description: '表格格式，可直接用 Excel 打开编辑',
    icon: Table,
    extension: '.csv',
    mimeType: 'text/csv',
    category: 'data',
  },
  {
    key: 'prompt_list',
    label: 'AI 提示词',
    description: 'Markdown 格式，包含所有画面/视频提示词和配音文本',
    icon: Sparkles,
    extension: '.md',
    mimeType: 'text/markdown',
    category: 'media',
  },
];

// ==================== Export Panel Component ====================
export default function ExportPanel({
  storyboards,
  episodeId,
  episodeTitle,
  dramaTitle,
  duration,
  status,
}: ExportPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportedFormats, setExportedFormats] = useState<Set<string>>(new Set());

  const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 0), 0);
  const isMerged = status === 'merged';

  const handleExport = async (format: ExportFormat) => {
    setExporting(format.key);

    try {
      // Use download URL to trigger direct file download
      const downloadUrl = exportApi.downloadUrl(episodeId, format.key);

      // Create a hidden link to trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `第${episodeTitle || ''}集${format.extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportedFormats((prev) => new Set(prev).add(format.key));
      toast.success(`${format.label} 导出成功`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导出失败';
      toast.error(`${format.label} 导出失败: ${msg}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    setExporting('all');
    let successCount = 0;
    const failedFormats: string[] = [];

    for (const format of EXPORT_FORMATS) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Stagger downloads
        const downloadUrl = exportApi.downloadUrl(episodeId, format.key);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `第${episodeTitle || ''}集${format.extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        successCount++;
        setExportedFormats((prev) => new Set(prev).add(format.key));
      } catch {
        failedFormats.push(format.label);
      }
    }

    setExporting(null);

    if (failedFormats.length === 0) {
      toast.success(`全部 ${successCount} 个格式导出成功`);
    } else {
      toast.warning(`已导出 ${successCount}/${EXPORT_FORMATS.length} 个格式，失败: ${failedFormats.join(', ')}`);
    }
  };

  // Group formats by category
  const categories = [
    { key: 'subtitle', label: '字幕格式', formats: EXPORT_FORMATS.filter((f) => f.category === 'subtitle') },
    { key: 'data', label: '数据格式', formats: EXPORT_FORMATS.filter((f) => f.category === 'data') },
    { key: 'script', label: '文档格式', formats: EXPORT_FORMATS.filter((f) => f.category === 'script') },
  ];

  return (
    <div className="space-y-4">
      {/* Completion Status */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
        <CardContent className="p-6 pt-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
              <Check className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                制作流程完成
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                短剧制作流程已全部完成！您可以预览各分镜成果，并选择需要的格式进行导出。
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t">
            <div className="text-center">
              <Film className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <p className="text-sm font-semibold tabular-nums">{storyboards.length}</p>
              <p className="text-xs text-muted-foreground">分镜总数</p>
            </div>
            <div className="text-center">
              <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
              <p className="text-sm font-semibold tabular-nums">
                {Math.floor(totalDuration / 60) > 0
                  ? `${Math.floor(totalDuration / 60)}分${Math.floor(totalDuration % 60)}秒`
                  : `${Math.floor(totalDuration)}秒`}
              </p>
              <p className="text-xs text-muted-foreground">预计时长</p>
            </div>
            <div className="text-center">
              <FileText className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <p className="text-sm font-semibold tabular-nums">
                {storyboards.filter((sb) => sb.dialogue).length}
              </p>
              <p className="text-xs text-muted-foreground">含对话</p>
            </div>
            <div className="text-center">
              <Check className="h-4 w-4 mx-auto mb-1 text-green-500" />
              <p className="text-sm font-semibold tabular-nums">{exportedFormats.size}</p>
              <p className="text-xs text-muted-foreground">已导出</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Format Groups */}
      {categories.map((category) => (
        <Card key={category.key}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {category.key === 'subtitle' && <Subtitles className="h-4 w-4" />}
              {category.key === 'data' && <FileJson className="h-4 w-4" />}
              {category.key === 'script' && <FileText className="h-4 w-4" />}
              {category.label}
              <Badge variant="outline" className="text-xs ml-auto">
                {category.formats.length} 种
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {category.formats.map((format) => {
              const isExporting = exporting === format.key;
              const isExported = exportedFormats.has(format.key);
              const IconComponent = format.icon;

              return (
                <motion.div
                  key={format.key}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isExported
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : 'bg-muted/50'
                      }`}
                    >
                      <IconComponent
                        className={`h-4 w-4 ${
                          isExported
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{format.label}</p>
                        <Badge variant="outline" className="text-xs font-mono">
                          {format.extension}
                        </Badge>
                        {isExported && (
                          <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                            已导出
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isExported ? 'outline' : 'default'}
                      onClick={() => handleExport(format)}
                      disabled={isExporting !== null}
                      className="gap-1.5 shrink-0"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          导出中
                        </>
                      ) : isExported ? (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          重新导出
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          导出
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Export All Button */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                批量导出
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                一键导出所有 {EXPORT_FORMATS.length} 种格式文件
              </p>
            </div>
            <Button
              onClick={handleExportAll}
              disabled={exporting !== null}
              variant="outline"
              className="gap-2"
            >
              {exporting === 'all' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  批量导出中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  全部导出
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storyboard Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Film className="h-4 w-4" />
            分镜概览
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar">
            {storyboards.map((sb, idx) => (
              <motion.div
                key={sb.id}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: idx * 0.02 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/50 transition-colors"
              >
                <Badge variant="outline" className="text-xs font-mono shrink-0">
                  #{sb.storyboardNumber}
                </Badge>
                <span className="flex-1 truncate text-sm">
                  {sb.title || `分镜 ${sb.storyboardNumber}`}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {sb.composedImage && (
                    <div className="w-2 h-2 rounded-full bg-green-500" title="已生成画面" />
                  )}
                  {(sb.videoUrl || sb.composedVideoUrl) && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" title="已生成视频" />
                  )}
                  {sb.ttsAudioUrl && (
                    <div className="w-2 h-2 rounded-full bg-purple-500" title="已生成配音" />
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                    {sb.duration || 5}s
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
