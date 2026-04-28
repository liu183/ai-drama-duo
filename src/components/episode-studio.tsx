'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  Loader2,
  Save,
  Sparkles,
  Users,
  MapPin,
  PanelRightOpen,
  PanelRightClose,
  FileText,
  ImageIcon,
  Video,
  Music,
  Link2,
  Package,
  Download,
  Mic,
  Film,
  Clapperboard,
  Pencil,
  MessageSquare,
  Clock,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  episodeApi,
  characterApi,
  sceneApi,
  storyboardApi,
  agentApi,
} from '@/lib/api';
import { toast } from 'sonner';

// ==================== Types ====================
interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  content: string;
  scriptContent: string;
  status: string;
  duration: number;
  dramaId?: string;
}

interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  appearance: string;
  personality: string;
  voiceStyle: string;
  voiceProvider: string;
  imageUrl: string;
}

interface Scene {
  id: string;
  location: string;
  time: string;
  prompt: string;
  status: string;
}

interface Storyboard {
  id: string;
  storyboardNumber: number;
  title: string;
  location: string;
  time: string;
  shotType: string;
  angle: string;
  movement: string;
  action: string;
  result: string;
  atmosphere: string;
  imagePrompt: string;
  videoPrompt: string;
  dialogue: string;
  description: string;
  duration: number;
  composedImage: string;
  videoUrl: string;
  status: string;
  characters?: Character[];
}

type StudioProps = {
  dramaId: string;
  episodeId: string;
  episodeNumber: number;
  onBack: () => void;
};

// ==================== Pipeline Steps ====================
const PIPELINE_STEPS = [
  { key: 'raw_content', label: '原始内容', icon: FileText, emoji: '📝' },
  { key: 'script_rewrite', label: 'AI改写', icon: Pencil, emoji: '✍️' },
  { key: 'character_extract', label: '角色提取', icon: Users, emoji: '👥' },
  { key: 'voice_assign', label: '配音分配', icon: Mic, emoji: '🎭' },
  { key: 'storyboard', label: '分镜拆解', icon: Clapperboard, emoji: '🎬' },
  { key: 'image_gen', label: '画面生成', icon: ImageIcon, emoji: '🖼️' },
  { key: 'video_gen', label: '视频生成', icon: Video, emoji: '🎥' },
  { key: 'tts', label: '配音合成', icon: Music, emoji: '🎵' },
  { key: 'compose', label: '成片合成', icon: Link2, emoji: '🔗' },
  { key: 'merge', label: '集数合并', icon: Package, emoji: '📦' },
  { key: 'export', label: '导出完成', icon: Download, emoji: '✅' },
];

const AGENT_TYPES: Record<string, string> = {
  script_rewrite: 'script_rewriter',
  character_extract: 'extractor',
  voice_assign: 'voice_assigner',
  storyboard: 'storyboard_breaker',
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  in_progress: { label: '进行中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  scripted: { label: '已编剧', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: '失败', color: 'bg-red-100 text-red-700 dark:text-red-400' },
  pending: { label: '待处理', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

// ==================== Step Completion Check ====================
function getStepStatus(stepKey: string, episode: Episode, characters: Character[], storyboards: Storyboard[]): 'done' | 'active' | 'pending' {
  switch (stepKey) {
    case 'raw_content':
      return episode.content ? 'done' : 'pending';
    case 'script_rewrite':
      return episode.scriptContent ? 'done' : 'pending';
    case 'character_extract':
      return characters.length > 0 ? 'done' : 'pending';
    case 'voice_assign':
      return characters.some(c => c.voiceStyle) ? 'done' : 'pending';
    case 'storyboard':
      return storyboards.length > 0 ? 'done' : 'pending';
    default:
      return 'pending';
  }
}

// ==================== Component ====================
export default function EpisodeStudioView({
  dramaId,
  episodeId,
  episodeNumber,
  onBack,
}: StudioProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [storyboards, setStoryboards] = useState<Storyboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentLoading, setAgentLoading] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [agentResult, setAgentResult] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedStoryboard, setSelectedStoryboard] = useState<Storyboard | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ep, chars, sceneList, sbList] = await Promise.all([
        episodeApi.get(episodeId),
        characterApi.list(dramaId),
        sceneApi.list(dramaId),
        storyboardApi.list(episodeId),
      ]);
      // API responses are wrapped in { data: ... }, unwrap them
      const epData = ep.data || ep;
      setEpisode(epData);
      setCharacters(Array.isArray(chars) ? chars : chars.data || chars.items || []);
      setScenes(Array.isArray(sceneList) ? sceneList : sceneList.data || sceneList.items || []);
      setStoryboards(Array.isArray(sbList) ? sbList : sbList.data || sbList.items || []);
      setRawContent(epData.content || '');
    } catch {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [episodeId, dramaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-advance to next available step
  useEffect(() => {
    if (!episode || characters.length === 0) return;
    if (episode.content && currentStep === 0) setCurrentStep(1);
    if (episode.scriptContent && currentStep <= 1) setCurrentStep(2);
    if (characters.length > 0 && currentStep <= 2) setCurrentStep(3);
    if (characters.some(c => c.voiceStyle) && currentStep <= 3) setCurrentStep(4);
    if (storyboards.length > 0 && currentStep <= 4) setCurrentStep(5);
  }, [episode, characters, storyboards]);

  const handleSaveContent = async () => {
    if (!episode) return;
    setSaving(true);
    try {
      const updateRes = await episodeApi.update(episodeId, { content: rawContent });
      const updatedData = updateRes.data || updateRes;
      setEpisode({ ...episode, ...updatedData, content: rawContent });
      toast.success('原始内容已保存');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRunAgent = async (stepKey: string) => {
    const agentType = AGENT_TYPES[stepKey];
    if (!agentType) {
      toast.info('该功能正在开发中...');
      return;
    }

    setAgentLoading(stepKey);
    setShowResult(true);
    setAgentResult('');

    try {
      const res = await agentApi.run({
        agentType,
        dramaId,
        episodeId,
        message: stepKey === 'script_rewrite'
          ? '请将原始小说内容改写为短剧剧本格式'
          : stepKey === 'character_extract'
          ? '请从内容中提取所有角色信息'
          : stepKey === 'voice_assign'
          ? '请为所有角色分配合适的配音风格'
          : '请将剧本拆解为分镜脚本',
      });

      const agentData = res.data || res;
      setAgentResult(agentData.result || agentData.output || agentData.message || JSON.stringify(agentData, null, 2));
      toast.success('Agent 执行完成');
      // Reload data
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Agent 执行失败';
      setAgentResult(`错误: ${msg}`);
      toast.error('Agent 执行失败');
    } finally {
      setAgentLoading(null);
    }
  };

  const progressPercent = Math.round(
    (PIPELINE_STEPS.filter((s, i) => getStepStatus(s.key, episode || { content: '', scriptContent: '', status: 'draft', episodeNumber: 0, id: '', title: '', duration: 0 }, characters, storyboards) === 'done').length /
      PIPELINE_STEPS.length) *
      100
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-4">
          <Skeleton className="h-96 w-64" />
          <Skeleton className="h-96 flex-1" />
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">集数不存在</p>
        <Button variant="outline" onClick={onBack} className="mt-4">返回</Button>
      </div>
    );
  }

  const step = PIPELINE_STEPS[currentStep];
  const stepStatus = getStepStatus(step.key, episode, characters, storyboards);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-card/50 backdrop-blur-sm shrink-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">
              {episode.title || `第 ${episodeNumber} 集`}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={`text-xs ${STATUS_MAP[episode.status]?.color || ''}`}>
                {STATUS_MAP[episode.status]?.label || episode.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                进度 {progressPercent}%
              </span>
            </div>
          </div>
          <Progress value={progressPercent} className="w-24 h-1.5" />
          <Separator orientation="vertical" className="h-6 hidden md:block" />
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
          {/* Mobile sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <Clapperboard className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar - Pipeline Steps */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -280 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -280 }}
                className="fixed inset-0 z-50 md:hidden"
              >
                <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
                <motion.div className="absolute left-0 top-0 bottom-0 w-72 bg-background border-r shadow-xl z-50 overflow-y-auto">
                  <PipelineSidebar
                    currentStep={currentStep}
                    setCurrentStep={(s) => { setCurrentStep(s); setMobileSidebarOpen(false); }}
                    episode={episode}
                    characters={characters}
                    storyboards={storyboards}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop sidebar */}
          <div className="hidden md:block w-64 shrink-0 border-r bg-card/30">
            <ScrollArea className="h-full">
              <PipelineSidebar
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
                episode={episode}
                characters={characters}
                storyboards={storyboards}
              />
            </ScrollArea>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-hidden" ref={mainContentRef}>
            <ScrollArea className="h-full">
              <div className="p-4 md:p-6 space-y-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <StepHeader
                      step={step}
                      status={stepStatus}
                      onRunAgent={() => handleRunAgent(step.key)}
                      agentLoading={agentLoading === step.key}
                      hasAgent={!!AGENT_TYPES[step.key]}
                    />

                    {renderStepContent({
                      stepKey: step.key,
                      episode,
                      rawContent,
                      setRawContent,
                      saving,
                      handleSaveContent,
                      scriptContent: episode.scriptContent,
                      characters,
                      storyboards,
                      selectedStoryboard,
                      setSelectedStoryboard,
                      agentLoading: agentLoading === step.key,
                      agentResult,
                      showResult,
                      setShowResult,
                    })}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一步
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentStep + 1} / {PIPELINE_STEPS.length}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(Math.min(PIPELINE_STEPS.length - 1, currentStep + 1))}
                    disabled={currentStep === PIPELINE_STEPS.length - 1}
                  >
                    下一步
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel */}
          <AnimatePresence>
            {rightPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="hidden lg:block border-l bg-card/30 shrink-0 overflow-hidden"
              >
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4" style={{ width: 320 }}>
                    {/* Episode Info */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Film className="h-4 w-4" />
                        集数信息
                      </h4>
                      <Card className="bg-muted/30">
                        <CardContent className="p-3 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">集数</span>
                            <span>第 {episodeNumber} 集</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">状态</span>
                            <Badge className={`text-xs ${STATUS_MAP[episode.status]?.color || ''}`}>
                              {STATUS_MAP[episode.status]?.label || episode.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">时长</span>
                            <span>{episode.duration > 0 ? `${episode.duration.toFixed(0)}秒` : '未设置'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">分镜数</span>
                            <span>{storyboards.length}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator />

                    {/* Characters */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        角色列表 ({characters.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {characters.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            暂无角色，请在第3步提取
                          </p>
                        ) : (
                          characters.map((char) => (
                            <Card key={char.id} className="bg-muted/30">
                              <CardContent className="p-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{char.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {char.role === 'protagonist' ? '主角' : char.role === 'antagonist' ? '反派' : '配角'}
                                  </Badge>
                                </div>
                                {char.voiceStyle && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    <Mic className="h-3 w-3" />
                                    {char.voiceStyle}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Scenes */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        场景列表 ({scenes.length})
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {scenes.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            暂无场景
                          </p>
                        ) : (
                          scenes.map((scene) => (
                            <Card key={scene.id} className="bg-muted/30">
                              <CardContent className="p-2.5">
                                <p className="text-sm font-medium">{scene.location || '未命名'}</p>
                                {scene.time && (
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {scene.time}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ==================== Pipeline Sidebar ====================
function PipelineSidebar({
  currentStep,
  setCurrentStep,
  episode,
  characters,
  storyboards,
}: {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  episode: Episode;
  characters: Character[];
  storyboards: Storyboard[];
}) {
  return (
    <div className="p-3 space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
        制作流程
      </h3>
      {PIPELINE_STEPS.map((step, idx) => {
        const status = getStepStatus(step.key, episode, characters, storyboards);
        const isActive = currentStep === idx;
        return (
          <Tooltip key={step.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCurrentStep(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium shadow-sm'
                    : status === 'done'
                    ? 'text-foreground/80 hover:bg-muted/50'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  status === 'done'
                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                    : isActive
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {status === 'done' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span>{step.emoji}</span>
                  )}
                </div>
                <span className="truncate">{step.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {step.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

// ==================== Step Header ====================
function StepHeader({
  step,
  status,
  onRunAgent,
  agentLoading,
  hasAgent,
}: {
  step: (typeof PIPELINE_STEPS)[0];
  status: 'done' | 'active' | 'pending';
  onRunAgent: () => void;
  agentLoading: boolean;
  hasAgent: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
          {step.emoji}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{step.label}</h3>
          <Badge
            variant="outline"
            className={`text-xs mt-0.5 ${
              status === 'done'
                ? 'border-green-300 text-green-600 dark:border-green-700 dark:text-green-400'
                : ''
            }`}
          >
            {status === 'done' ? '已完成' : '待处理'}
          </Badge>
        </div>
      </div>
      {hasAgent && (
        <Button
          onClick={onRunAgent}
          disabled={agentLoading}
          className="gap-2"
        >
          {agentLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              处理中...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              AI 处理
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// ==================== Step Content Renderer ====================
function renderStepContent(props: {
  stepKey: string;
  episode: Episode;
  rawContent: string;
  setRawContent: (v: string) => void;
  saving: boolean;
  handleSaveContent: () => void;
  scriptContent: string;
  characters: Character[];
  storyboards: Storyboard[];
  selectedStoryboard: Storyboard | null;
  setSelectedStoryboard: (sb: Storyboard | null) => void;
  agentLoading: boolean;
  agentResult: string;
  showResult: boolean;
  setShowResult: (v: boolean) => void;
}) {
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

    // Steps 6-11: Placeholder panels
    case 'image_gen':
      return (
        <WorkInProgressPanel
          icon={<ImageIcon className="h-12 w-12" />}
          title="画面生成"
          description="基于分镜的画面提示词，AI 自动生成每一帧画面"
          items={props.storyboards.map((sb) => ({
            id: sb.id,
            title: `#${sb.storyboardNumber} ${sb.title || ''}`,
            status: sb.composedImage ? 'done' : 'pending',
            prompt: sb.imagePrompt,
          }))}
        />
      );

    case 'video_gen':
      return (
        <WorkInProgressPanel
          icon={<Video className="h-12 w-12" />}
          title="视频生成"
          description="基于画面和视频提示词，生成动态视频片段"
          items={props.storyboards.map((sb) => ({
            id: sb.id,
            title: `#${sb.storyboardNumber} ${sb.title || ''}`,
            status: sb.videoUrl ? 'done' : 'pending',
            prompt: sb.videoPrompt,
          }))}
        />
      );

    case 'tts':
      return (
        <WorkInProgressPanel
          icon={<Music className="h-12 w-12" />}
          title="配音合成"
          description="为每个分镜的对话生成语音配音"
          items={props.storyboards.filter(s => s.dialogue).map((sb) => ({
            id: sb.id,
            title: `#${sb.storyboardNumber}`,
            status: sb.ttsAudioUrl ? 'done' : 'pending',
            prompt: sb.dialogue,
          }))}
        />
      );

    case 'compose':
      return <WorkInProgressPanel
        icon={<Link2 className="h-12 w-12" />}
        title="成片合成"
        description="将画面、视频、配音合成为完整的分镜片段"
        items={props.storyboards.map((sb) => ({
          id: sb.id,
          title: `#${sb.storyboardNumber}`,
          status: sb.composedVideoUrl ? 'done' : 'pending',
        }))}
      />;

    case 'merge':
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium">集数合并</h3>
            <p className="text-sm text-muted-foreground mt-2">
              将所有分镜片段按顺序合并为完整的一集短剧
            </p>
            <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>共有 {props.storyboards.length} 个分镜待合并</p>
              <p className="mt-1">预计总时长: {props.storyboards.reduce((a, s) => a + s.duration, 0)}秒</p>
            </div>
          </CardContent>
        </Card>
      );

    case 'export':
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium">导出完成</h3>
            <p className="text-sm text-muted-foreground mt-2">
              短剧制作流程已完成，可导出最终成果
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                预览
              </Button>
              <Button className="gap-2">
                <Download className="h-4 w-4" />
                导出
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

// ==================== Work In Progress Panel ====================
function WorkInProgressPanel({
  icon,
  title,
  description,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  items: { id: string; title: string; status: string; prompt?: string }[];
}) {
  const doneCount = items.filter(i => i.status === 'done').length;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground/30 mx-auto mb-3">{icon}</div>
          <h3 className="text-lg font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
          <div className="mt-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <Progress value={items.length > 0 ? (doneCount / items.length) * 100 : 0} className="w-32 h-2" />
              <span className="text-muted-foreground">
                {doneCount}/{items.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {items.map((item) => (
            <Card key={item.id} className="bg-muted/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  item.status === 'done'
                    ? 'bg-green-500'
                    : 'bg-muted-foreground/30'
                }`} />
                <span className="text-sm flex-1 truncate">{item.title}</span>
                {item.prompt && (
                  <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px] hidden sm:block">
                    {item.prompt.slice(0, 40)}...
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
