'use client';

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music,
  Upload,
  X,
  Play,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Volume2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { storyboardApi } from '@/lib/api';

// ==================== Types ====================
interface TTSStoryboard {
  id: string;
  storyboardNumber: number;
  title: string;
  dialogue: string;
  duration: number;
  ttsAudioUrl: string;
  status: string;
  characters?: { character?: { name: string; voiceStyle: string } }[] | { name: string; voiceStyle: string }[];
}

interface TTSPanelProps {
  storyboards: TTSStoryboard[];
  characters: { name: string; voiceStyle: string }[];
  episodeId: string;
  loadData: () => Promise<void>;
}

// ==================== TTS Panel Component ====================
export default function TTSPanel({ storyboards, characters, episodeId, loadData }: TTSPanelProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const stats = useMemo(() => {
    const total = storyboards.length;
    const withDialogue = storyboards.filter((s) => s.dialogue).length;
    const withAudio = storyboards.filter((s) => s.ttsAudioUrl).length;
    const totalDuration = storyboards.reduce((sum, s) => sum + (s.duration || 0), 0);
    return { total, withDialogue, withAudio, totalDuration };
  }, [storyboards]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  const handleUploadClick = (sbId: string) => {
    fileInputRefs.current[sbId]?.click();
  };

  const handleFileChange = async (sbId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('请选择音频文件（MP3/WAV/M4A）');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('音频文件大小不能超过 50MB');
      return;
    }

    setUploadingId(sbId);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      await storyboardApi.update(sbId, { ttsAudioUrl: base64 });
      toast.success('配音文件已上传');
      await loadData();
    } catch {
      toast.error('上传失败');
    } finally {
      setUploadingId(null);
    }
  };

  const handleRemoveAudio = async (sbId: string) => {
    try {
      await storyboardApi.update(sbId, { ttsAudioUrl: '' });
      toast.success('配音已移除');
      await loadData();
    } catch {
      toast.error('移除失败');
    }
  };

  const handlePlayAudio = (sbId: string, audioUrl: string) => {
    if (playingId === sbId) {
      setPlayingId(null);
      return;
    }

    // Stop any currently playing audio
    const existingAudio = document.querySelector('audio.tts-player');
    if (existingAudio) {
      (existingAudio as HTMLAudioElement).pause();
      existingAudio.remove();
    }

    // Create and play new audio
    const audio = new Audio(audioUrl);
    audio.className = 'tts-player';
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      toast.error('音频播放失败');
      setPlayingId(null);
    };
    audio.play().catch(() => toast.error('音频播放失败'));
    setPlayingId(sbId);
  };

  const handleBatchUpload = () => {
    toast.info('AI 批量配音功能即将上线，目前支持手动上传音频文件');
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Music className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-semibold tabular-nums">{stats.withDialogue}</p>
            <p className="text-xs text-muted-foreground">含对话</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Volume2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-semibold tabular-nums">{stats.withAudio}</p>
            <p className="text-xs text-muted-foreground">已配音</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <AlertCircle className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-semibold tabular-nums">{stats.withDialogue - stats.withAudio}</p>
            <p className="text-xs text-muted-foreground">待配音</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-semibold tabular-nums">{formatDuration(stats.totalDuration)}</p>
            <p className="text-xs text-muted-foreground">预计总时长</p>
          </CardContent>
        </Card>
      </div>

      {/* Character Voice Config Preview */}
      {characters.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              角色配音方案
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex flex-wrap gap-2">
              {characters.map((char) => (
                <Badge key={char.name} variant="outline" className="text-xs">
                  {char.name}
                  {char.voiceStyle && (
                    <span className="text-muted-foreground ml-1">· {char.voiceStyle}</span>
                  )}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Progress */}
      {batchProcessing && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">正在批量配音 {batchProgress.current}/{batchProgress.total}</span>
            </div>
            <Progress value={batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Storyboard TTS List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Music className="h-4 w-4" />
              分镜配音列表 ({stats.withAudio}/{stats.withDialogue})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={handleBatchUpload} disabled={batchProcessing} className="gap-1.5">
              <Music className="h-3.5 w-3.5" />
              批量配音
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
            {storyboards.map((sb) => {
              const hasDialogue = !!sb.dialogue;
              const hasAudio = !!sb.ttsAudioUrl;
              const isUploading = uploadingId === sb.id;
              const isPlaying = playingId === sb.id;

              // Find character names for this storyboard
              const charNames = sb.characters
                ?.map((c) => c.character.name)
                .filter(Boolean) || [];

              return (
                <motion.div
                  key={sb.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      hasAudio ? 'bg-green-500' : hasDialogue ? 'bg-amber-500' : 'bg-muted-foreground/20'
                    }`} />

                    {/* Number */}
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      #{sb.storyboardNumber}
                    </Badge>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium truncate">{sb.title || `分镜 ${sb.storyboardNumber}`}</p>
                        {charNames.length > 0 && (
                          <span className="text-xs text-muted-foreground">{charNames.join(', ')}</span>
                        )}
                      </div>
                      {hasDialogue ? (
                        <p className="text-xs text-foreground/60 line-clamp-2">&ldquo;{sb.dialogue}&rdquo;</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/50 italic">无对话内容</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasAudio ? (
                        <>
                          <Button
                            size="icon"
                            variant={isPlaying ? 'default' : 'outline'}
                            className="h-7 w-7"
                            onClick={() => handlePlayAudio(sb.id, sb.ttsAudioUrl)}
                          >
                            {isPlaying ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleRemoveAudio(sb.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          {hasDialogue && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1"
                              onClick={() => toast.info('AI 配音功能即将上线，请手动上传音频')}
                            >
                              <Music className="h-3.5 w-3.5" />
                              生成
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => handleUploadClick(sb.id)}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                        {sb.duration || 5}s
                      </span>
                    </div>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={(el) => { fileInputRefs.current[sb.id] = el; }}
                    type="file"
                    accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/ogg,audio/webm"
                    className="hidden"
                    onChange={(e) => handleFileChange(sb.id, e)}
                  />
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-muted/20">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            <strong>提示：</strong>支持上传 MP3/WAV/M4A/OGG 格式的音频文件（最大 50MB）。
            AI 自动配音功能正在开发中，目前请手动上传每个分镜的配音文件。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
