'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Check,
  Loader2,
  Clock,
  Film,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Link2,
  Music,
  Subtitles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { mergeApi } from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { TRANSITION_OPTIONS } from '@/lib/constants';

// ==================== Types ====================
interface MergeStoryboard {
  id: string;
  storyboardNumber: number;
  title: string;
  composedVideoUrl: string;
  videoUrl: string;
  ttsAudioUrl: string;
  subtitleUrl: string;
  duration: number;
  status: string;
  dialogue: string;
  composedImage: string;
}

interface MergePanelProps {
  storyboards: {
    id: string;
    storyboardNumber: number;
    title: string;
    composedVideoUrl: string;
    videoUrl: string;
    ttsAudioUrl: string;
    subtitleUrl: string;
    duration: number;
    status: string;
    dialogue: string;
    composedImage: string;
  }[];
  episodeId: string;
  loadData: () => Promise<void>;
}

// ==================== Merge Panel Component ====================
export default function MergePanel({ storyboards, episodeId, loadData }: MergePanelProps) {
  const [merging, setMerging] = useState(false);
  const [mergeStatus, setMergeStatus] = useState<'idle' | 'loading' | 'merging' | 'done' | 'error'>('idle');
  const [mergeProgress, setMergeProgress] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [mergeConfig, setMergeConfig] = useState({
    transition: 'none' as string,
    addBgm: false,
    bgmVolume: 0.3,
  });

  // Compute storyboard readiness
  const storyboardStats = useMemo(() => {
    const total = storyboards.length;
    const withVideo = storyboards.filter(
      (sb) => sb.composedVideoUrl || sb.videoUrl
    ).length;
    const withAudio = storyboards.filter((sb) => sb.ttsAudioUrl).length;
    const withImage = storyboards.filter((sb) => sb.composedImage).length;
    const totalDuration = storyboards.reduce((sum, sb) => sum + (sb.duration || 0), 0);
    const hasDialogue = storyboards.filter((sb) => sb.dialogue).length;
    return { total, withVideo, withAudio, withImage, totalDuration, hasDialogue };
  }, [storyboards]);

  const isReadyToMerge = storyboardStats.withVideo > 0;

  // Simulate merge progress
  const handleMerge = async () => {
    if (!isReadyToMerge) {
      toast.error('没有可合并的视频内容，请先完成视频生成步骤');
      return;
    }

    setMerging(true);
    setMergeStatus('merging');
    setMergeProgress(0);

    try {
      // Select storyboards that have video content
      const storyboardIds = storyboards
        .filter((sb) => sb.composedVideoUrl || sb.videoUrl)
        .map((sb) => sb.id);

      // Call merge API
      const res = await mergeApi.merge({
        episodeId,
        storyboardIds,
        mergeConfig,
      });

      // Simulate progress animation
      const totalSteps = 100;
      const stepTime = 30; // ms per step
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise((r) => setTimeout(r, stepTime));
        setMergeProgress(i);
      }

      setMergeStatus('done');
      toast.success(
        `合并完成！共 ${storyboardIds.length} 个片段，总时长 ${storyboardStats.totalDuration.toFixed(0)}秒`
      );
      await loadData();
    } catch (err) {
      setMergeStatus('error');
      const msg = err instanceof Error ? err.message : '合并失败';
      toast.error(`合并失败: ${msg}`);
    } finally {
      setMerging(false);
    }
  };

  const toggleExpand = (sbId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(sbId)) next.delete(sbId);
      else next.add(sbId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Film className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-semibold tabular-nums">{storyboardStats.withVideo}</p>
            <p className="text-xs text-muted-foreground">可用视频</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Music className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-semibold tabular-nums">{storyboardStats.withAudio}</p>
            <p className="text-xs text-muted-foreground">配音片段</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Subtitles className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-semibold tabular-nums">{storyboardStats.hasDialogue}</p>
            <p className="text-xs text-muted-foreground">含对话</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-semibold tabular-nums">{formatDuration(storyboardStats.totalDuration)}</p>
            <p className="text-xs text-muted-foreground">预计总时长</p>
          </CardContent>
        </Card>
      </div>

      {/* Merge Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            合并设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">转场效果</p>
              <p className="text-xs text-muted-foreground">分镜之间的过渡方式</p>
            </div>
            <Select
              value={mergeConfig.transition}
              onValueChange={(v) => setMergeConfig({ ...mergeConfig, transition: v })}
            >
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRANSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">背景音乐</p>
              <p className="text-xs text-muted-foreground">为合并后的视频添加背景音乐</p>
            </div>
            <Switch
              checked={mergeConfig.addBgm}
              onCheckedChange={(checked) => setMergeConfig({ ...mergeConfig, addBgm: checked })}
            />
          </div>
          {mergeConfig.addBgm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pl-4"
            >
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground whitespace-nowrap">音量</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={mergeConfig.bgmVolume}
                  onChange={(e) =>
                    setMergeConfig({ ...mergeConfig, bgmVolume: parseFloat(e.target.value) })
                  }
                  className="flex-1 h-1.5"
                />
                <span className="text-xs tabular-nums w-8">{Math.round(mergeConfig.bgmVolume * 100)}%</span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Merge Progress */}
      <AnimatePresence>
        {mergeStatus === 'merging' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">正在合并视频...</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={mergeProgress} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground tabular-nums font-medium">
                    {mergeProgress}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  正在按顺序合并 {storyboardStats.withVideo} 个分镜片段...
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mergeStatus === 'done' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    合并完成
                  </span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-500">
                  共 {storyboardStats.withVideo} 个片段已合并，总时长 {formatDuration(storyboardStats.totalDuration)}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {mergeStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">合并失败，请重试</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Storyboard Merge List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Film className="h-4 w-4" />
              分镜合并列表 ({storyboardStats.withVideo}/{storyboardStats.total})
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-xs ${isReadyToMerge ? 'border-green-300 text-green-600' : ''}`}
            >
              {isReadyToMerge ? '可合并' : '等待视频'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {storyboards.map((sb) => {
              const hasVideo = !!(sb.composedVideoUrl || sb.videoUrl);
              const hasAudio = !!sb.ttsAudioUrl;
              const isExpanded = expandedItems.has(sb.id);

              return (
                <motion.div key={sb.id} layout>
                  <div
                    className={`flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors ${
                      hasVideo ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50'
                    }`}
                    onClick={() => hasVideo && toggleExpand(sb.id)}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        hasVideo ? 'bg-green-500' : 'bg-muted-foreground/20'
                      }`}
                    />
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      #{sb.storyboardNumber}
                    </Badge>
                    <span className="flex-1 truncate text-sm">
                      {sb.title || `分镜 ${sb.storyboardNumber}`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasAudio && (
                        <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 px-1.5 py-0">
                          <Music className="h-2.5 w-2.5 mr-0.5" />
                          配音
                        </Badge>
                      )}
                      {hasVideo && (
                        <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 px-1.5 py-0">
                          <Film className="h-2.5 w-2.5 mr-0.5" />
                          视频
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                        {sb.duration || 5}s
                      </span>
                      {hasVideo && (
                        isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && hasVideo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-4 mr-2 mb-1"
                      >
                        <div className="bg-muted/30 rounded-md p-2 text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <Film className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">视频:</span>
                            <span className="truncate flex-1">
                              {sb.composedVideoUrl || sb.videoUrl ? '已就绪' : '未生成'}
                            </span>
                          </div>
                          {hasAudio && (
                            <div className="flex items-center gap-2">
                              <Music className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">配音:</span>
                              <span>已就绪</span>
                            </div>
                          )}
                          {sb.dialogue && (
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground">对话:</span>
                              <span className="line-clamp-2">{sb.dialogue}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Merge Button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          {isReadyToMerge
            ? `已就绪 ${storyboardStats.withVideo} 个片段，点击开始合并`
            : '请先完成视频生成步骤，确保分镜有视频内容'}
        </p>
        <Button
          onClick={handleMerge}
          disabled={!isReadyToMerge || merging}
          className="gap-2"
        >
          {merging ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              合并中...
            </>
          ) : mergeStatus === 'done' ? (
            <>
              <RefreshCw className="h-4 w-4" />
              重新合并
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              开始合并
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
