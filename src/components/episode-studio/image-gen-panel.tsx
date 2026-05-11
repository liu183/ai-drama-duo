'use client';

import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  ImageIcon,
  Wand2,
  Layers,
  Copy,
  Upload,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { storyboardApi } from '@/lib/api';
import { copyToClipboard, fileToBase64 } from '@/lib/utils';
import type { Storyboard } from '@/types';

interface ImageGenPanelProps {
  storyboards: Storyboard[];
  agentLoading: boolean;
  loadData: () => Promise<void>;
  dramaMetadata?: Record<string, unknown> | null;
}

function getImageSize(metadata?: Record<string, unknown> | null): string {
  if (!metadata) return '1024x1024';
  try {
    const imageStyle = (metadata.imageStyle || {}) as Record<string, string>;
    const ratio = imageStyle.aspectRatio || '1:1';
    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024',
      '16:9': '1344x768',
      '9:16': '768x1344',
      '4:3': '1152x864',
      '3:4': '864x1152',
      '3:2': '1152x768',
      '2:3': '768x1152',
    };
    return sizeMap[ratio] || '1024x1024';
  } catch {
    return '1024x1024';
  }
}

export function ImageGenPanel({
  storyboards,
  agentLoading,
  loadData,
  dramaMetadata,
}: ImageGenPanelProps) {
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; generating: boolean }>({
    current: 0,
    total: 0,
    generating: false,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Compute initial statuses from storyboard data
  const imageStatuses = useMemo<Record<string, 'pending' | 'generating' | 'completed' | 'failed'>>(() => {
    const statuses: Record<string, 'pending' | 'generating' | 'completed' | 'failed'> = {};
    storyboards.forEach(sb => {
      statuses[sb.id] = generatingId === sb.id ? 'generating' : (sb.composedImage || uploadedImages[sb.id]) ? 'completed' : 'pending';
    });
    return statuses;
  }, [storyboards, uploadedImages, generatingId]);

  const handleGeneratePrompt = async () => {
    toast.info('请点击上方「AI 处理」按钮生成画面提示词');
  };

  // AI 生成单张图片
  const handleSingleGenerate = async (sbId: string) => {
    const sb = storyboards.find(s => s.id === sbId);
    if (!sb?.imagePrompt) {
      toast.error('该分镜没有画面提示词，请先生成提示词');
      return;
    }

    setGeneratingId(sbId);
    try {
      const resp = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyboardId: sbId, prompt: sb.imagePrompt, size: getImageSize(dramaMetadata) }),
      });
      const data = await resp.json();
      if (data.success) {
        setUploadedImages(prev => ({ ...prev, [sbId]: data.base64 }));
        toast.success('画面生成成功');
        await loadData();
      } else {
        toast.error(data.error || data.message || '画面生成失败');
      }
    } catch (err) {
      toast.error('画面生成请求失败，请重试');
      console.error('Image gen error:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  // AI 批量生成图片
  const handleBatchGenerate = async () => {
    const pending = storyboards.filter(sb => sb.imagePrompt && !sb.composedImage && !uploadedImages[sb.id]);
    if (pending.length === 0) {
      toast.info('没有需要生成的分镜（没有待处理的提示词）');
      return;
    }

    setBatchProgress({ current: 0, total: pending.length, generating: true });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pending.length; i++) {
      const sb = pending[i];
      setBatchProgress(prev => ({ ...prev, current: i + 1 }));
      try {
        const resp = await fetch('/api/generate/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyboardId: sb.id, prompt: sb.imagePrompt, size: getImageSize(dramaMetadata) }),
        });
        const data = await resp.json();
        if (data.success) {
          setUploadedImages(prev => ({ ...prev, [sb.id]: data.base64 }));
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
      // 间隔 500ms 避免频率限制
      await new Promise(r => setTimeout(r, 500));
    }

    setBatchProgress(prev => ({ ...prev, generating: false }));
    toast.success(`批量生成完成：${successCount} 成功，${failCount} 失败`);
    await loadData();
  };

  const handleCopyPrompt = async (sbId: string, prompt: string) => {
    const success = await copyToClipboard(prompt);
    if (success) {
      setCopiedId(sbId);
      toast.success('提示词已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error('复制失败，请手动选择复制');
    }
  };

  const handleUploadClick = (sbId: string) => {
    fileInputRefs.current[sbId]?.click();
  };

  const handleFileChange = async (sbId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    // Validate file size (max 10MB for base64 storage)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setUploadingId(sbId);
    try {
      const base64 = await fileToBase64(file);

      // Update the storyboard's composedImage via API
      await storyboardApi.update(sbId, { composedImage: base64 });

      // Update local state
      setUploadedImages(prev => ({ ...prev, [sbId]: base64 }));
      toast.success('图片上传成功');
      await loadData();
    } catch (err) {
      toast.error('图片上传失败，请重试');
      console.error('Upload error:', err);
    } finally {
      setUploadingId(null);
      // Reset file input
      if (fileInputRefs.current[sbId]) {
        fileInputRefs.current[sbId]!.value = '';
      }
    }
  };

  const handleRemoveImage = async (sbId: string) => {
    try {
      await storyboardApi.update(sbId, { composedImage: '' });
      setUploadedImages(prev => {
        const next = { ...prev };
        delete next[sbId];
        return next;
      });
      toast.success('图片已移除');
      await loadData();
    } catch {
      toast.error('移除图片失败');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (sbId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('请拖放图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }
    setUploadingId(sbId);
    try {
      const base64 = await fileToBase64(file);
      await storyboardApi.update(sbId, { composedImage: base64 });
      setUploadedImages(prev => ({ ...prev, [sbId]: base64 }));
      toast.success('图片上传成功');
      await loadData();
    } catch {
      toast.error('图片上传失败，请重试');
    } finally {
      setUploadingId(null);
    }
  };

  const completedCount = storyboards.filter(s => s.imagePrompt).length;
  const imageCount = storyboards.filter(s => s.composedImage || uploadedImages[s.id]).length;

  if (storyboards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">暂无分镜数据</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            请先完成分镜拆解，然后再进行画面生成
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary & Action Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium">
                  共 {storyboards.length} 个分镜
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">
                    提示词: {completedCount}/{storyboards.length}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    画面: {imageCount}/{storyboards.length}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePrompt}
                disabled={agentLoading || completedCount === storyboards.length}
                className="gap-1.5"
              >
                <Wand2 className="h-3.5 w-3.5" />
                AI生成提示词
              </Button>
              <Button
                size="sm"
                onClick={handleBatchGenerate}
                disabled={agentLoading || batchProgress.generating || completedCount === 0}
                className="gap-1.5"
              >
                {batchProgress.generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Layers className="h-3.5 w-3.5" />
                )}
                {batchProgress.generating
                  ? `生成中 ${batchProgress.current}/${batchProgress.total}`
                  : '批量生成画面'}
              </Button>
            </div>
          </div>

          {/* Batch Progress */}
          {batchProgress.generating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 pt-3 border-t"
            >
              <div className="flex items-center gap-2 text-sm mb-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-muted-foreground">
                  正在生成 {batchProgress.current}/{batchProgress.total}
                </span>
              </div>
              <Progress
                value={batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}
                className="h-2"
              />
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Grid View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {storyboards.map((sb, idx) => {
          const status = imageStatuses[sb.id] || 'pending';
          const statusInfo = {
            pending: { label: '待处理', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
            generating: { label: '生成中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            completed: { label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
            failed: { label: '失败', color: 'bg-red-100 text-red-700 dark:text-red-400' },
          }[status];

          const displayImage = uploadedImages[sb.id] || sb.composedImage;
          const isUploading = uploadingId === sb.id;
          const isCopied = copiedId === sb.id;

          return (
            <motion.div
              key={sb.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
            >
              <Card className="overflow-hidden h-full">
                {/* Image Preview / Upload Area */}
                <div
                  className={`aspect-video bg-muted/50 relative overflow-hidden ${!displayImage ? 'cursor-pointer' : ''}`}
                  onClick={() => !displayImage && handleUploadClick(sb.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(sb.id, e)}
                >
                  {isUploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted/30">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">上传中...</p>
                      </div>
                    </div>
                  ) : displayImage ? (
                    <>
                      <img
                        src={displayImage}
                        alt={sb.title || `分镜 ${sb.storyboardNumber}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Hover overlay with actions */}
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors group">
                        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 bg-background/90 hover:bg-background"
                                onClick={(e) => { e.stopPropagation(); handleUploadClick(sb.id); }}
                              >
                                <Upload className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>替换图片</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 bg-background/90 hover:bg-destructive"
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(sb.id); }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>移除图片</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </>
                  ) : sb.imagePrompt ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-4">
                        <Upload className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground/50">点击或拖放上传图片</p>
                        <p className="text-xs text-muted-foreground/40 mt-0.5">支持 JPG / PNG / WebP</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-4">
                        <Layers className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground/50">等待提示词生成</p>
                      </div>
                    </div>
                  )}
                  {/* Status overlay */}
                  <div className="absolute top-2 left-2">
                    <Badge className={`text-xs ${statusInfo.color}`}>
                      {status === 'generating' && (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      )}
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                      #{sb.storyboardNumber}
                    </Badge>
                  </div>
                  {/* Hidden file input */}
                  <input
                    ref={(el) => { fileInputRefs.current[sb.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleFileChange(sb.id, e)}
                  />
                </div>

                {/* Content */}
                <CardContent className="p-3">
                  <h4 className="text-sm font-medium truncate mb-1.5">
                    {sb.title || `分镜 ${sb.storyboardNumber}`}
                  </h4>

                  {/* Image Prompt with Copy Button */}
                  {sb.imagePrompt ? (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-muted-foreground">画面提示词</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleCopyPrompt(sb.id, sb.imagePrompt)}
                              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors ${
                                isCopied
                                  ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  已复制
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  复制
                                </>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{isCopied ? '已复制' : '点击复制提示词'}</TooltipContent>
                        </Tooltip>
                      </div>
                      <p
                        className="text-xs text-foreground/70 bg-muted/40 rounded p-1.5 line-clamp-2 leading-relaxed cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => handleCopyPrompt(sb.id, sb.imagePrompt)}
                        title="点击复制提示词"
                      >
                        {sb.imagePrompt}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic mb-2">
                      暂无画面提示词
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => handleSingleGenerate(sb.id)}
                      disabled={!sb.imagePrompt || generatingId === sb.id}
                    >
                      {generatingId === sb.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Layers className="h-3 w-3" />
                      )}
                      {generatingId === sb.id ? '生成中...' : '生成画面'}
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1.5"
                          onClick={() => handleUploadClick(sb.id)}
                          disabled={isUploading}
                        >
                          <Upload className="h-3 w-3" />
                          上传
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>上传外部生成的图片</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
