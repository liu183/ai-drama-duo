'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Link2,
  Play,
  Check,
  Loader2,
  Clock,
  Film,
  Music,
  Subtitles,
  Image,
  AlertCircle,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { storyboardApi, fetchAPI } from '@/lib/api';

// ==================== Types ====================
interface ComposeStoryboard {
  id: string;
  storyboardNumber: number;
  title: string;
  duration: number;
  composedImage: string;
  videoUrl: string;
  ttsAudioUrl: string;
  subtitleUrl: string;
  composedVideoUrl: string;
  dialogue: string;
  status: string;
}

interface ComposePanelProps {
  storyboards: ComposeStoryboard[];
  episodeId: string;
  loadData: () => Promise<void>;
}

// ==================== Compose Panel Component ====================
export default function ComposePanel({ storyboards, episodeId, loadData }: ComposePanelProps) {
  const [composing, setComposing] = useState(false);
  const [composeProgress, setComposeProgress] = useState(0);
  const [composeStatus, setComposeStatus] = useState<'idle' | 'loading' | 'composing' | 'done' | 'error'>('idle');
  const [config, setConfig] = useState({
    resolution: '1920x1080',
    addSubtitles: true,
    audioMix: true,
  });

  const stats = useMemo(() => {
    const total = storyboards.length;
    const withImage = storyboards.filter((s) => s.composedImage).length;
    const withVideo = storyboards.filter((s) => s.videoUrl).length;
    const withAudio = storyboards.filter((s) => s.ttsAudioUrl).length;
    const composed = storyboards.filter((s) => s.composedVideoUrl).length;
    const totalDuration = storyboards.reduce((sum, s) => sum + (s.duration || 0), 0);
    return { total, withImage, withVideo, withAudio, composed, totalDuration };
  }, [storyboards]);

  const isReadyToCompose = stats.withImage > 0 || stats.withVideo > 0;

  const handleCompose = async () => {
    if (!isReadyToCompose) {
      toast.error('没有可合成的素材，请先完成画面生成或视频生成步骤');
      return;
    }

    setComposing(true);
    setComposeStatus('composing');
    setComposeProgress(0);

    try {
      // Call compose API
      const res = await fetchAPI('/compose', {
        method: 'POST',
        body: JSON.stringify({
          episodeId,
          composeConfig: config,
        }),
      });

      // Simulate progress
      const totalSteps = 100;
      const stepTime = 25;
      for (let i = 0; i <= totalSteps; i++) {
        await new Promise((r) => setTimeout(r, stepTime));
        setComposeProgress(i);
      }

      setComposeStatus('done');
      const data = res.data || res;
      toast.success(`合成完成！已合成 ${data.composedCount}/${data.totalStoryboards} 个分镜`);
      await loadData();
    } catch (err) {
      setComposeStatus('error');
      const msg = err instanceof Error ? err.message : '合成失败';
      toast.error(`合成失败: ${msg}`);
    } finally {
      setComposing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Film className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-semibold tabular-nums">{stats.withImage}</p>
            <p className="text-xs text-muted-foreground">画面</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Film className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-semibold tabular-nums">{stats.withVideo}</p>
            <p className="text-xs text-muted-foreground">视频</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Music className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-semibold tabular-nums">{stats.withAudio}</p>
            <p className="text-xs text-muted-foreground">配音</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Check className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-semibold tabular-nums">{stats.composed}</p>
            <p className="text-xs text-muted-foreground">已合成</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-sm font-semibold tabular-nums">{formatDuration(stats.totalDuration)}</p>
            <p className="text-xs text-muted-foreground">总时长</p>
          </CardContent>
        </Card>
      </div>

      {/* Compose Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            合成设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">输出分辨率</p>
              <p className="text-xs text-muted-foreground">合成视频的画面分辨率</p>
            </div>
            <select
              value={config.resolution}
              onChange={(e) => setConfig({ ...config, resolution: e.target.value })}
              className="text-sm border rounded-md px-3 py-1.5 bg-background"
            >
              <option value="1920x1080">1920x1080 (1080P)</option>
              <option value="1280x720">1280x720 (720P)</option>
              <option value="1080x1920">1080x1920 (竖屏)</option>
              <option value="720x1280">720x1280 (竖屏720)</option>
            </select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">添加字幕</p>
              <p className="text-xs text-muted-foreground">将对话内容作为字幕叠加到画面上</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, addSubtitles: !config.addSubtitles })}
              className={`relative w-10 h-5 rounded-full transition-colors ${config.addSubtitles ? 'bg-primary' : 'bg-muted'}`}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                animate={{ left: config.addSubtitles ? 22 : 2 }}
                transition={{ duration: 0.2 }}
              />
            </button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">混音</p>
              <p className="text-xs text-muted-foreground">将配音与原视频音轨混合</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, audioMix: !config.audioMix })}
              className={`relative w-10 h-5 rounded-full transition-colors ${config.audioMix ? 'bg-primary' : 'bg-muted'}`}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                animate={{ left: config.audioMix ? 22 : 2 }}
                transition={{ duration: 0.2 }}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Compose Progress */}
      {composeStatus === 'composing' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">正在合成分镜片段...</span>
              </div>
              <Progress value={composeProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                正在处理 {storyboards.length} 个分镜的合成任务...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {composeStatus === 'done' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-green-700 dark:text-green-400">合成完成</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                {stats.composed} 个分镜片段已成功合成
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Storyboard Compose List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              分镜合成列表
            </CardTitle>
            <Badge variant="outline" className={`text-xs ${stats.composed === stats.total && stats.total > 0 ? 'border-green-300 text-green-600' : ''}`}>
              {stats.composed}/{stats.total} 已合成
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {storyboards.map((sb) => {
              const isComposed = !!sb.composedVideoUrl;
              const hasAssets = !!(sb.composedImage || sb.videoUrl);

              return (
                <div
                  key={sb.id}
                  className="flex items-center gap-2 px-2 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    isComposed ? 'bg-green-500' : hasAssets ? 'bg-amber-500' : 'bg-muted-foreground/20'
                  }`} />
                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                    #{sb.storyboardNumber}
                  </Badge>
                  <span className="flex-1 truncate text-sm">{sb.title || `分镜 ${sb.storyboardNumber}`}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {sb.composedImage && <span title="画面"><Image className="h-3 w-3 text-blue-400" /></span>}
                    {sb.videoUrl && <span title="视频"><Film className="h-3 w-3 text-purple-400" /></span>}
                    {sb.ttsAudioUrl && <span title="配音"><Music className="h-3 w-3 text-green-400" /></span>}
                    {sb.dialogue && <span title="对话"><Subtitles className="h-3 w-3 text-amber-400" /></span>}
                    {isComposed && (
                      <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 px-1.5 py-0">
                        <Check className="h-2.5 w-2.5 mr-0.5" />
                        已合成
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                      {sb.duration || 5}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compose Button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          {isReadyToCompose
            ? `已就绪 ${stats.withImage + stats.withVideo} 个分镜素材`
            : '请先完成画面生成或视频生成步骤'}
        </p>
        <Button onClick={handleCompose} disabled={!isReadyToCompose || composing} className="gap-2">
          {composing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              合成中...
            </>
          ) : composeStatus === 'done' ? (
            <>
              <RefreshCw className="h-4 w-4" />
              重新合成
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              开始合成
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
