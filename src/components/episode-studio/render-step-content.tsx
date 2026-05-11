'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Save,
  FileText,
  Users,
  Mic,
  Clapperboard,
  MessageSquare,
  Video,
  Music,
  Link2,
  Package,
  Download,
  ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { STATUS_MAP } from '@/lib/constants';
import type { Episode, Character, Scene, Storyboard } from '@/types';
import { ImageGenPanel } from './image-gen-panel';
import { VideoGenPanel } from './video-gen-panel';
import MergePanel from '@/components/merge-panel';
import ExportPanel from '@/components/export-panel';
import TTSPanel from '@/components/tts-panel';
import ComposePanel from '@/components/compose-panel';

export interface StepContentProps {
  stepKey: string;
  episode: Episode;
  rawContent: string;
  setRawContent: (v: string) => void;
  saving: boolean;
  handleSaveContent: () => void;
  scriptContent: string;
  characters: Character[];
  scenes: Scene[];
  storyboards: Storyboard[];
  selectedStoryboard: Storyboard | null;
  setSelectedStoryboard: (sb: Storyboard | null) => void;
  agentLoading: boolean;
  agentResult: string;
  showResult: boolean;
  setShowResult: (v: boolean) => void;
  dramaId: string;
  episodeId: string;
  loadData: () => Promise<void>;
  dramaTitle?: string;
  dramaMetadata?: Record<string, unknown> | null;
}

export function renderStepContent(props: StepContentProps) {
  const { stepKey } = props;

  switch (stepKey) {
    case 'raw_content':
      return (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">
                将小说或故事原文粘贴到下方，作为 AI 改写的基础内容
              </p>
              <textarea
                className="w-full min-h-[400px] rounded-lg border border-input bg-background px-4 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y custom-scrollbar"
                placeholder="在此粘贴小说原文或故事内容..."
                value={props.rawContent}
                onChange={(e) => props.setRawContent(e.target.value)}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">
                  {props.rawContent.length} 字
                </span>
                <Button onClick={props.handleSaveContent} disabled={props.saving} className="gap-2">
                  {props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存内容
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case 'script_rewrite':
      return (
        <div className="space-y-4">
          {props.scriptContent ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">改写结果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {props.scriptContent}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">尚未生成剧本</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  请先在第1步输入原始内容，然后点击「AI 处理」按钮生成剧本
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      );

    case 'character_extract':
      return (
        <div className="space-y-4">
          {props.characters.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {props.characters.map((char) => (
                <Card key={char.id} className="overflow-hidden">
                  <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="h-8 w-8 text-primary/20" />
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm">{char.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {char.role === 'protagonist' ? '主角' : char.role === 'antagonist' ? '反派' : char.role === 'supporting' ? '配角' : '群演'}
                      </Badge>
                    </div>
                    {char.appearance && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {char.appearance}
                      </p>
                    )}
                    {char.personality && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        性格: {char.personality}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">尚未提取角色</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  请先完成剧本改写，然后点击「AI 处理」提取角色
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      );

    case 'voice_assign':
      return (
        <div className="space-y-4">
          {props.characters.some(c => c.voiceStyle) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {props.characters.map((char) => (
                <Card key={char.id}>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-sm">{char.name}</h4>
                    <Separator className="my-2" />
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">配音风格</span>
                        <p className={char.voiceStyle ? '' : 'text-muted-foreground italic'}>
                          {char.voiceStyle || '未分配'}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">配音提供商</span>
                        <p className={char.voiceProvider ? '' : 'text-muted-foreground italic'}>
                          {char.voiceProvider || '未分配'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Mic className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">尚未分配配音</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  请先提取角色，然后点击「AI 处理」自动分配配音
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      );

    case 'storyboard':
      return (
        <div className="space-y-4">
          {props.storyboards.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground">
                共 {props.storyboards.length} 个分镜
              </div>
              <div className="space-y-3">
                {props.storyboards.map((sb) => (
                  <Card
                    key={sb.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => props.setSelectedStoryboard(
                      props.selectedStoryboard?.id === sb.id ? null : sb
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                              #{sb.storyboardNumber}
                            </Badge>
                            <h4 className="font-medium text-sm truncate">
                              {sb.title || `分镜 ${sb.storyboardNumber}`}
                            </h4>
                            {sb.shotType && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {sb.shotType}
                              </Badge>
                            )}
                            <Badge className={`text-xs shrink-0 ${STATUS_MAP[sb.status]?.color || ''}`}>
                              {STATUS_MAP[sb.status]?.label || sb.status}
                            </Badge>
                          </div>
                          {sb.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {sb.description}
                            </p>
                          )}
                          {sb.dialogue && (
                            <p className="text-sm text-primary/80 mt-1 flex items-start gap-1">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                              {sb.dialogue}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground shrink-0 ml-2">
                          {sb.duration}秒
                        </div>
                      </div>

                      {/* Expanded Detail */}
                      <AnimatePresence>
                        {props.selectedStoryboard?.id === sb.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <Separator className="my-3" />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                              {sb.location && (
                                <div>
                                  <span className="text-xs text-muted-foreground">地点</span>
                                  <p>{sb.location}</p>
                                </div>
                              )}
                              {sb.time && (
                                <div>
                                  <span className="text-xs text-muted-foreground">时间</span>
                                  <p>{sb.time}</p>
                                </div>
                              )}
                              {sb.angle && (
                                <div>
                                  <span className="text-xs text-muted-foreground">镜头角度</span>
                                  <p>{sb.angle}</p>
                                </div>
                              )}
                              {sb.movement && (
                                <div>
                                  <span className="text-xs text-muted-foreground">镜头运动</span>
                                  <p>{sb.movement}</p>
                                </div>
                              )}
                              {sb.atmosphere && (
                                <div>
                                  <span className="text-xs text-muted-foreground">氛围</span>
                                  <p>{sb.atmosphere}</p>
                                </div>
                              )}
                              {sb.action && (
                                <div className="col-span-2 md:col-span-3">
                                  <span className="text-xs text-muted-foreground">动作</span>
                                  <p>{sb.action}</p>
                                </div>
                              )}
                              {sb.result && (
                                <div className="col-span-2 md:col-span-3">
                                  <span className="text-xs text-muted-foreground">画面结果</span>
                                  <p>{sb.result}</p>
                                </div>
                              )}
                              {sb.imagePrompt && (
                                <div className="col-span-full">
                                  <span className="text-xs text-muted-foreground">画面提示词</span>
                                  <p className="text-xs bg-muted/50 p-2 rounded mt-0.5">{sb.imagePrompt}</p>
                                </div>
                              )}
                              {sb.videoPrompt && (
                                <div className="col-span-full">
                                  <span className="text-xs text-muted-foreground">视频提示词</span>
                                  <p className="text-xs bg-muted/50 p-2 rounded mt-0.5">{sb.videoPrompt}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clapperboard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">尚未生成分镜</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  请先完成剧本改写，然后点击「AI 处理」自动拆解分镜
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      );

    // ==================== Step 6: Image Generation ====================
    case 'image_gen':
      return (
        <ImageGenPanel
          storyboards={props.storyboards}
          agentLoading={props.agentLoading}
          loadData={props.loadData}
          dramaMetadata={props.dramaMetadata}
        />
      );

    // ==================== Step 7: Video Generation ====================
    case 'video_gen':
      return (
        <VideoGenPanel
          storyboards={props.storyboards}
          agentLoading={props.agentLoading}
          loadData={props.loadData}
        />
      );

    // ==================== Step 8: TTS ====================
    case 'tts':
      return (
        <TTSPanel
          storyboards={props.storyboards}
          characters={props.characters.map(c => ({ name: c.name, voiceStyle: c.voiceStyle }))}
          episodeId={props.episodeId}
          loadData={props.loadData}
        />
      );

    // ==================== Step 9: Compose ====================
    case 'compose':
      return (
        <ComposePanel
          storyboards={props.storyboards}
          episodeId={props.episodeId}
          loadData={props.loadData}
        />
      );

    // ==================== Step 10: Merge ====================
    case 'merge':
      return (
        <MergePanel
          storyboards={props.storyboards.map(sb => ({
            id: sb.id,
            storyboardNumber: sb.storyboardNumber,
            title: sb.title,
            composedVideoUrl: sb.composedVideoUrl,
            videoUrl: sb.videoUrl,
            ttsAudioUrl: sb.ttsAudioUrl,
            subtitleUrl: sb.subtitleUrl,
            duration: sb.duration,
            status: sb.status,
            dialogue: sb.dialogue,
            composedImage: sb.composedImage,
          }))}
          episodeId={props.episodeId}
          loadData={props.loadData}
        />
      );

    // ==================== Step 11: Export ====================
    case 'export':
      return (
        <ExportPanel
          storyboards={props.storyboards.map(sb => ({
            id: sb.id,
            storyboardNumber: sb.storyboardNumber,
            title: sb.title,
            duration: sb.duration,
            dialogue: sb.dialogue,
            imagePrompt: sb.imagePrompt,
            videoPrompt: sb.videoPrompt,
            composedImage: sb.composedImage,
            videoUrl: sb.videoUrl,
            composedVideoUrl: sb.composedVideoUrl,
            ttsAudioUrl: sb.ttsAudioUrl,
          }))}
          episodeId={props.episodeId}
          episodeTitle={props.episode.title || ''}
          dramaTitle={props.dramaTitle || ''}
          duration={props.episode.duration}
          status={props.episode.status}
        />
      );

    default:
      return null;
  }
}
