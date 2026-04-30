'use client';

import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Loader2,
  Video,
  Sparkles,
  Copy,
  Upload,
  Check,
  X,
  Clock,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { storyboardApi } from '@/lib/api';
import { copyToClipboard, fileToBase64 } from '@/lib/utils';
import type { Storyboard } from '@/types';

interface VideoGenPanelProps {
  storyboards: Storyboard[];
  agentLoading: boolean;
  loadData: () => Promise<void>;
}

// Extract motion parameters from video prompt
function parseVideoParams(prompt: string): { cleanPrompt: string; params: string[] } {
  const paramRegex = /\[([^\]]+)\]/g;
  const params: string[] = [];
  let cleanPrompt = prompt;
  let match;
  while ((match = paramRegex.exec(prompt)) !== null) {
    params.push(match[1]);
  }
  if (params.length > 0) {
    cleanPrompt = prompt.replace(/\[[^\]]+\]/g, '').trim();
  }
  return { cleanPrompt, params };
}

export function VideoGenPanel({
  storyboards,
  agentLoading,
  loadData,
}: VideoGenPanelProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedVideos, setUploadedVideos] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; generating: boolean }>({ current: 0, total: 0, generating: false });
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Compute video statuses
  const videoStatuses = useMemo<Record<string, 'pending' | 'generating' | 'completed'>>(() => {
    const statuses: Record<string, 'pending' | 'generating' | 'completed'> = {};
    storyboards.forEach(sb => {
      statuses[sb.id] = generatingId === sb.id ? 'generating' : (sb.videoUrl || uploadedVideos[sb.id]) ? 'completed' : 'pending';
    });
    return statuses;
  }, [storyboards, uploadedVideos, generatingId]);

  const handleCopyPrompt = async (sbId: string, prompt: string) => {
    const success = await copyToClipboard(prompt);
    if (success) {
      setCopiedId(sbId);
      toast.success('视频提示词已复制到剪贴板');
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error('复制失败，请手动选择复制');
    }
  };

  const handleUploadClick = (sbId: string) => {
    videoInputRefs.current[sbId]?.click();
  };

  const handleVideoFileChange = async (sbId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('请选择视频文件');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('视频大小不能超过 50MB');
      return;
    }

    setUploadingId(sbId);
    try {
      const base64 = await fileToBase64(file);
      await storyboardApi.update(sbId, { videoUrl: base64 });
      setUploadedVideos(prev => ({ ...prev, [sbId]: base64 }));
      toast.success('视频上传成功');
      await loadData();
    } catch {
      toast.error('视频上传失败，请重试');
    } finally {
      setUploadingId(null);
      if (videoInputRefs.current[sbId]) {
        videoInputRefs.current[sbId]!.value = '';
      }
    }
  };

  const handleRemoveVideo = async (sbId: string) => {
    try {
      await storyboardApi.update(sbId, { videoUrl: '' });
      setUploadedVideos(prev => {
        const next = { ...prev };
        delete next[sbId];
        return next;
      });
      toast.success('视频已移除');
      await loadData();
    } catch {
      toast.error('移除视频失败');
    }
  };

  // AI 生成单个视频
  const handleSingleGenerate = async (sbId: string) => {
    const sb = storyboards.find(s => s.id === sbId);
    if (!sb?.videoPrompt) {
      toast.error('该分镜没有视频提示词，请先生成提示词');
      return;
    }

    setGeneratingId(sbId);
    try {
      const { cleanPrompt, params } = parseVideoParams(sb.videoPrompt);
      let motionScale = 1;
      let cameraSpeed = 1;
      params.forEach(p => {
        if (p.includes('motion_scale')) motionScale = parseFloat(p.split('=')[1]) || 1;
        if (p.includes('camera_speed')) cameraSpeed = parseFloat(p.split('=')[1]) || 1;
      });

      const resp = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboardId: sbId,
          prompt: cleanPrompt,
          referenceImage: sb.composedImage || undefined,
          motionScale,
          cameraSpeed,
        }),
      });
      const data = await resp.json();
      if (data.success && data.base64) {
        setUploadedVideos(prev => ({ ...prev, [sbId]: data.base64 }));
        toast.success('视频生成成功');
        await loadData();
      } else {
        toast.error(data.error || data.message || '视频生成失败');
      }
    } catch (err) {
      toast.error('视频生成请求失败，请重试');
      console.error('Video gen error:', err);
    } finally {
      setGeneratingId(null);
    }
  };

  // AI 批量生成视频
  const handleBatchGenerate = async () => {
    const pending = storyboards.filter(sb => sb.videoPrompt && !sb.videoUrl && !uploadedVideos[sb.id]);
    if (pending.length === 0) {
      toast.info('没有需要生成的分镜');
      return;
    }

    setBatchProgress({ current: 0, total: pending.length, generating: true });
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < pending.length; i++) {
      const sb = pending[i];
      setBatchProgress(prev => ({ ...prev, current: i + 1 }));
      setGeneratingId(sb.id);
      try {
        const { cleanPrompt, params } = parseVideoParams(sb.videoPrompt);
        let motionScale = 1, cameraSpeed = 1;
        params.forEach(p => {
          if (p.includes('motion_scale')) motionScale = parseFloat(p.split('=')[1]) || 1;
          if (p.includes('camera_speed')) cameraSpeed = parseFloat(p.split('=')[1]) || 1;
        });
        const resp = await fetch('/api/generate/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyboardId: sb.id, prompt: cleanPrompt, referenceImage: sb.composedImage || undefined, motionScale, cameraSpeed }),
        });
        const data = await resp.json();
        if (data.success && data.base64) {
          setUploadedVideos(prev => ({ ...prev, [sb.id]: data.base64 }));
          successCount++;
        } else {
          failCount++;
        }
      } catch { failCount++; }
      setGeneratingId(null);
      await new Promise(r => setTimeout(r, 1000));
    }

    setBatchProgress(prev => ({ ...prev, generating: false }));
    toast.success(`批量生成完成：${successCount} 成功，${failCount} 失败`);
    await loadData();
  };

  const promptCount = storyboards.filter(s => s.videoPrompt).length;
  const videoCount = storyboards.filter(s => s.videoUrl || uploadedVideos[s.id]).length;
  const imageCount = storyboards.filter(s => s.composedImage).length;

  if (storyboards.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Video className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">暂无分镜数据</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            请先完成分镜拆解，然后再进行视频生成
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
                    视频提示词: {promptCount}/{storyboards.length}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    画面图片: {imageCount}/{storyboards.length}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    生成视频: {videoCount}/{storyboards.length}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleBatchGenerate}
                disabled={agentLoading || batchProgress.generating || imageCount === 0}
                className="gap-1.5"
              >
                {batchProgress.generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {batchProgress.generating
                  ? `生成中 ${batchProgress.current}/${batchProgress.total}`
                  : '批量生成视频'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/80">视频生成说明</p>
              <p>1. 点击上方「AI 处理」按钮生成每个分镜的视频提示词</p>
              <p>2. 视频提示词描述动态运动和镜头变化，与画面提示词互补</p>
              <p>3. 基于画面图片进行图生视频，或直接上传外部生成的视频</p>
              <p>4. 支持 MP4 / WebM / MOV 格式，单个视频最大 50MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {storyboards.map((sb, idx) => {
          const status = videoStatuses[sb.id] || 'pending';
          const statusInfo = {
            pending: { label: '待处理', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
            generating: { label: '生成中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            completed: { label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
          }[status];

          const displayVideo = uploadedVideos[sb.id] || sb.videoUrl;
          const displayImage = sb.composedImage;
          const isUploading = uploadingId === sb.id;
          const isCopied = copiedId === sb.id;
          const { cleanPrompt, params } = parseVideoParams(sb.videoPrompt || '');

          return (
            <motion.div
              key={sb.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
            >
              <Card className="overflow-hidden h-full">
                {/* Video Preview / Image Reference / Upload Area */}
                <div
                  className={`aspect-video bg-muted/50 relative overflow-hidden ${!displayVideo && !displayImage ? 'cursor-pointer' : ''}`}
                  onClick={() => !displayVideo && !displayImage && handleUploadClick(sb.id)}
                >
                  {isUploading ? (
                    <div className="w-full h-full flex items-center justify-center bg-muted/30">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">上传中...</p>
                      </div>
                    </div>
                  ) : displayVideo ? (
                    <>
                      <video
                        src={displayVideo}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group">
                        <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <Play className="h-5 w-5 text-gray-800 ml-0.5" />
                        </div>
                        {/* Actions */}
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
                            <TooltipContent>替换视频</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 bg-background/90 hover:bg-destructive"
                                onClick={(e) => { e.stopPropagation(); handleRemoveVideo(sb.id); }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>移除视频</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </>
                  ) : displayImage ? (
                    <>
                      <img
                        src={displayImage}
                        alt={sb.title || `分镜 ${sb.storyboardNumber}`}
                        className="w-full h-full object-cover opacity-70"
                      />
                      {/* Reference image overlay with upload button */}
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center">
                        <div className="text-center mb-3">
                          <Video className="h-8 w-8 text-white/50 mx-auto mb-1" />
                          <p className="text-xs text-white/70">基于此画面生成视频</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="gap-1.5 text-xs"
                          onClick={(e) => { e.stopPropagation(); handleSingleGenerate(sb.id); }}
                          disabled={agentLoading || !sb.videoPrompt}
                        >
                          <Sparkles className="h-3 w-3" />
                          生成视频
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center p-4">
                        <Video className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground/50">等待画面生成</p>
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
                  {/* Duration indicator */}
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm gap-1">
                      <Clock className="h-3 w-3" />
                      {sb.duration}s
                    </Badge>
                  </div>
                  {/* Hidden file input */}
                  <input
                    ref={(el) => { videoInputRefs.current[sb.id] = el; }}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    className="hidden"
                    onChange={(e) => handleVideoFileChange(sb.id, e)}
                  />
                </div>

                {/* Content */}
                <CardContent className="p-3">
                  <h4 className="text-sm font-medium truncate mb-1.5">
                    {sb.title || `分镜 ${sb.storyboardNumber}`}
                  </h4>

                  {/* Video Prompt with Copy Button */}
                  {sb.videoPrompt ? (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-xs text-muted-foreground">视频提示词</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleCopyPrompt(sb.id, sb.videoPrompt)}
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
                        onClick={() => handleCopyPrompt(sb.id, sb.videoPrompt)}
                        title="点击复制提示词"
                      >
                        {cleanPrompt || sb.videoPrompt}
                      </p>
                      {/* Video params badges */}
                      {params.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {params.map((param, pi) => (
                            <Badge key={pi} variant="secondary" className="text-xs px-1.5 py-0 h-5 font-normal">
                              {param}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic mb-2">
                      暂无视频提示词
                    </p>
                  )}

                  {/* Image prompt reference (collapsed) */}
                  {sb.imagePrompt && (
                    <details className="mb-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                        查看画面提示词
                      </summary>
                      <p className="text-xs text-foreground/50 bg-muted/30 rounded p-1.5 mt-1 line-clamp-2 leading-relaxed">
                        {sb.imagePrompt}
                      </p>
                    </details>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={() => handleSingleGenerate(sb.id)}
                      disabled={agentLoading || generatingId === sb.id || (!sb.videoPrompt && !displayImage)}
                    >
                      {generatingId === sb.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {generatingId === sb.id ? '生成中...' : '生成视频'}
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
                      <TooltipContent>上传外部生成的视频</TooltipContent>
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
