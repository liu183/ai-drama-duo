'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  AlertCircle,
  Wand2,
  Layers,
  ImagePlus,
  Copy,
  Upload,
  X,
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
import MergePanel from '@/components/merge-panel';
import ExportPanel from '@/components/export-panel';
import TTSPanel from '@/components/tts-panel';
import ComposePanel from '@/components/compose-panel';

// ==================== Copy to Clipboard Utility ====================
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-HTTPS environments
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

// ==================== File to Base64 Utility ====================
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  ttsAudioUrl: string;
  subtitleUrl: string;
  composedVideoUrl: string;
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
  image_gen: 'image_prompt_generator',
  video_gen: 'video_prompt_generator',
};

// ==================== AI Processing Visualization Steps ====================
const AGENT_STEPS: Record<string, string[]> = {
  script_rewriter: [
    '分析原始小说内容...',
    '识别场景和人物...',
    '提取关键对话和动作...',
    '转换为剧本格式...',
    '优化剧本节奏和结构...',
    '输出最终剧本...',
  ],
  extractor: [
    '分析剧本内容...',
    '识别出场角色...',
    '提取角色特征和关系...',
    '识别场景信息...',
    '生成角色和场景数据...',
  ],
  voice_assigner: [
    '加载角色列表...',
    '分析角色性格特征...',
    '匹配最佳配音风格...',
    '分配配音方案...',
  ],
  storyboard_breaker: [
    '分析剧本结构...',
    '划分场景段落...',
    '设计镜头语言...',
    '标注动作和对话...',
    '计算各镜头时长...',
    '输出分镜脚本...',
  ],
  image_prompt_generator: [
    '加载分镜数据...',
    '分析场景氛围...',
    '生成画面构图描述...',
    '添加风格和细节提示...',
    '输出英文提示词...',
  ],
  video_prompt_generator: [
    '加载分镜和画面数据...',
    '分析镜头运动方式...',
    '设计动态过渡效果...',
    '生成运动描述提示词...',
    '标注推荐视频参数...',
    '输出视频提示词...',
  ],
};

// Step descriptions for upcoming/placeholder panels
const UPCOMING_STEP_INFO: Record<string, { title: string; description: string; icon: typeof ImageIcon; dependencies: string[]; dataPreview: (storyboards: Storyboard[], characters: Character[]) => { label: string; value: string }[] }> = {
  video_gen: {
    title: '视频生成',
    description: '基于画面和视频提示词，AI 为每个分镜生成动态视频片段，实现画面的流动效果和转场动画',
    icon: Video,
    dependencies: ['画面提示词', '画面图片'],
    dataPreview: (storyboards) => {
      const withImages = storyboards.filter(s => s.composedImage).length;
      const withPrompts = storyboards.filter(s => s.videoPrompt).length;
      return [
        { label: '总分镜数', value: `${storyboards.length}` },
        { label: '已有画面', value: `${withImages}` },
        { label: '已有视频提示词', value: `${withPrompts}` },
      ];
    },
  },
  tts: {
    title: '配音合成',
    description: '为每个分镜的对话内容生成语音配音，支持多种音色和情感表达，自动匹配角色配音方案。可上传已有的音频文件作为配音素材。',
    icon: Music,
    dependencies: ['角色配音方案', '分镜对话'],
    dataPreview: (storyboards) => {
      const withDialogue = storyboards.filter(s => s.dialogue).length;
      const withAudio = storyboards.filter(s => s.ttsAudioUrl).length;
      return [
        { label: '总分镜数', value: `${storyboards.length}` },
        { label: '包含对话', value: `${withDialogue}` },
        { label: '已配音', value: `${withAudio}` },
      ];
    },
  },
  compose: {
    title: '成片合成',
    description: '将每个分镜的画面、视频和配音合成为完整的分镜片段，添加字幕和转场效果，生成可播放的视频内容。',
    icon: Link2,
    dependencies: ['画面生成', '配音合成'],
    dataPreview: (storyboards) => {
      const withVideo = storyboards.filter(s => s.videoUrl).length;
      const withComposed = storyboards.filter(s => s.composedVideoUrl).length;
      return [
        { label: '总分镜数', value: `${storyboards.length}` },
        { label: '已有视频', value: `${withVideo}` },
        { label: '已合成', value: `${withComposed}` },
        { label: '预计总时长', value: `${storyboards.reduce((a, s) => a + s.duration, 0)}秒` },
      ];
    },
  },
  merge: {
    title: '集数合并',
    description: '将所有分镜片段按顺序合并为完整的一集短剧，可配置转场效果和背景音乐，生成最终成片。',
    icon: Package,
    dependencies: ['成片合成'],
    dataPreview: (storyboards) => {
      const withVideo = storyboards.filter(s => s.videoUrl || s.composedVideoUrl).length;
      return [
        { label: '总分镜数', value: `${storyboards.length}` },
        { label: '可用片段', value: `${withVideo}` },
        { label: '预计总时长', value: `${storyboards.reduce((a, s) => a + s.duration, 0)}秒` },
      ];
    },
  },
  export: {
    title: '导出完成',
    description: '短剧制作流程已完成，可预览最终成果并导出为多种格式',
    icon: Download,
    dependencies: ['集数合并'],
    dataPreview: (storyboards) => [
      { label: '总分镜数', value: `${storyboards.length}` },
      { label: '预计总时长', value: `${storyboards.reduce((a, s) => a + s.duration, 0)}秒` },
    ],
  },
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
    case 'image_gen':
      return storyboards.length > 0 && storyboards.every(s => s.imagePrompt) ? 'done' : 'pending';
    case 'video_gen':
      return storyboards.length > 0 && storyboards.every(s => s.videoPrompt) ? 'done' : 'pending';
    case 'tts':
      return storyboards.length > 0 && storyboards.some(s => s.ttsAudioUrl) ? 'done' : 'pending';
    case 'compose':
      return storyboards.length > 0 && storyboards.every(s => s.composedVideoUrl) ? 'done' : 'pending';
    case 'merge':
      return episode.status === 'merged' ? 'done' : 'pending';
    case 'export':
      return episode.status === 'merged' ? 'done' : 'pending';
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
  const [aiSteps, setAiSteps] = useState<{ text: string; done: boolean; elapsed: string }[]>([]);
  const [aiProcessingDone, setAiProcessingDone] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const aiTimerRef = useRef<NodeJS.Timeout[]>([]);

  const clearAiTimers = useCallback(() => {
    aiTimerRef.current.forEach(t => clearTimeout(t));
    aiTimerRef.current = [];
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearAiTimers();
  }, [clearAiTimers]);

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
    if (storyboards.length > 0 && storyboards.every(s => s.imagePrompt) && currentStep <= 5) setCurrentStep(6);
    if (storyboards.length > 0 && storyboards.every(s => s.videoPrompt) && currentStep <= 6) setCurrentStep(7);
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

  const startAiVisualization = useCallback((agentType: string) => {
    const steps = AGENT_STEPS[agentType];
    if (!steps || steps.length === 0) return;

    clearAiTimers();
    setAiSteps([]);
    setAiProcessingDone(false);

    // Show steps one by one with simulated timing
    const delays = steps.map(() => {
      return 600 + Math.random() * 1200; // 0.6s to 1.8s per step
    });

    let cumulativeDelay = 0;
    const stepStartTimes: number[] = [];

    steps.forEach((stepText, idx) => {
      cumulativeDelay += delays[idx];
      stepStartTimes.push(cumulativeDelay);

      const timer = setTimeout(() => {
        setAiSteps(prev => [
          ...prev,
          { text: stepText, done: false, elapsed: '' },
        ]);

        // Mark step as done after a short delay
        const doneTimer = setTimeout(() => {
          const elapsed = (delays[idx] / 1000).toFixed(1);
          setAiSteps(prev =>
            prev.map((s, i) =>
              i === idx ? { ...s, done: true, elapsed: `${elapsed}s` } : s
            )
          );

          // If last step, mark processing as done
          if (idx === steps.length - 1) {
            setTimeout(() => setAiProcessingDone(true), 300);
          }
        }, 200 + Math.random() * 400);

        aiTimerRef.current.push(doneTimer);
      }, cumulativeDelay);

      aiTimerRef.current.push(timer);
    });
  }, [clearAiTimers]);

  const handleRunAgent = async (stepKey: string) => {
    const agentType = AGENT_TYPES[stepKey];
    if (!agentType) {
      toast.info('该功能正在开发中...');
      return;
    }

    setAgentLoading(stepKey);
    setShowResult(true);
    setAgentResult('');

    // Start AI visualization
    startAiVisualization(agentType);

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
          : stepKey === 'image_gen'
          ? '请为每个分镜生成英文画面提示词'
          : stepKey === 'video_gen'
          ? '请为每个分镜生成英文视频提示词'
          : '请将剧本拆解为分镜脚本',
      });

      const agentData = res.data || res;
      // Clear AI visualization timers
      clearAiTimers();
      // Mark all remaining steps as done quickly
      setAiSteps(prev =>
        prev.map(s => s.done ? s : { ...s, done: true, elapsed: '0.1s' })
      );
      setAiProcessingDone(true);

      setAgentResult(agentData.result || agentData.output || agentData.message || JSON.stringify(agentData, null, 2));
      toast.success('Agent 执行完成');
      // Reload data
      await loadData();
    } catch (err) {
      clearAiTimers();
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

                    {/* AI Processing Visualization */}
                    {agentLoading && aiSteps.length > 0 && (
                      <AIProcessingPanel
                        steps={aiSteps}
                        totalSteps={AGENT_STEPS[AGENT_TYPES[step.key] || '']?.length || 0}
                        done={aiProcessingDone}
                        resultPreview={agentResult ? agentResult.slice(0, 200) : ''}
                      />
                    )}

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
                      dramaId,
                      episodeId,
                      loadData,
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

// ==================== AI Processing Panel ====================
function AIProcessingPanel({
  steps,
  totalSteps,
  done,
  resultPreview,
}: {
  steps: { text: string; done: boolean; elapsed: string }[];
  totalSteps: number;
  done: boolean;
  resultPreview: string;
}) {
  const progressValue = totalSteps > 0 ? Math.round((steps.filter(s => s.done).length / totalSteps) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <Card className="border-primary/20 bg-primary/[0.02] dark:bg-primary/[0.04]">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-sm font-medium">
              {done ? 'AI 处理完成' : 'AI 正在处理...'}
            </span>
          </div>

          <div className="space-y-1.5 mb-3">
            <AnimatePresence>
              {steps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="shrink-0">
                    {step.done ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    )}
                  </span>
                  <span className={`flex-1 ${step.done ? 'text-foreground/70' : 'text-foreground'}`}>
                    {step.text}
                  </span>
                  {step.elapsed && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {step.elapsed}
                    </span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <Progress value={progressValue} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground tabular-nums font-medium">
              {progressValue}%
            </span>
          </div>

          {/* Result preview */}
          {done && resultPreview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mt-3 pt-3 border-t"
            >
              <span className="text-xs text-muted-foreground block mb-1">结果预览:</span>
              <p className="text-xs text-foreground/60 bg-muted/50 rounded-md p-2 line-clamp-3 leading-relaxed">
                {resultPreview}
                {resultPreview.length >= 200 ? '...' : ''}
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
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
  dramaId: string;
  episodeId: string;
  loadData: () => Promise<void>;
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

    // ==================== Step 6: Image Generation (Full Functionality) ====================
    case 'image_gen':
      return (
        <ImageGenPanel
          storyboards={props.storyboards}
          agentLoading={props.agentLoading}
          loadData={props.loadData}
        />
      );

    // ==================== Step 7: Video Generation (Full Functionality) ====================
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
          dramaTitle={''}
          duration={props.episode.duration}
          status={props.episode.status}
        />
      );

    default:
      return null;
  }
}

// ==================== Image Generation Panel ====================
function ImageGenPanel({
  storyboards,
  agentLoading,
  loadData,
}: {
  storyboards: Storyboard[];
  agentLoading: boolean;
  loadData: () => Promise<void>;
}) {
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
        body: JSON.stringify({ storyboardId: sbId, prompt: sb.imagePrompt, size: '1024x1024' }),
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
          body: JSON.stringify({ storyboardId: sb.id, prompt: sb.imagePrompt, size: '1024x1024' }),
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
                  <ImagePlus className="h-3.5 w-3.5" />
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
                        <ImagePlus className="h-3 w-3" />
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

// ==================== Video Generation Panel ====================
function VideoGenPanel({
  storyboards,
  agentLoading,
  loadData,
}: {
  storyboards: Storyboard[];
  agentLoading: boolean;
  loadData: () => Promise<void>;
}) {
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

  // Extract motion parameters from video prompt
  const parseVideoParams = (prompt: string): { cleanPrompt: string; params: string[] } => {
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
  };

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
                        onLoadedData={(e) => {
                          // Auto-play preview on hover is handled below
                        }}
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

// ==================== Upcoming Step Panel ====================
function UpcomingStepPanel({
  stepKey,
  info,
  storyboards,
  characters,
}: {
  stepKey: string;
  info: {
    title: string;
    description: string;
    icon: typeof ImageIcon;
    dependencies: string[];
    dataPreview: (storyboards: Storyboard[], characters: Character[]) => { label: string; value: string }[];
  };
  storyboards: Storyboard[];
  characters: Character[];
}) {
  const IconComponent = info.icon;
  const previewData = info.dataPreview(storyboards, characters);

  return (
    <div className="space-y-4">
      {/* Main Info Card */}
      <Card className="relative overflow-hidden">
        {/* Coming Soon Badge */}
        <div className="absolute top-3 right-3">
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs border-0">
            即将上线
          </Badge>
        </div>

        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 text-muted-foreground/50">
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold">{info.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {info.description}
              </p>
            </div>
          </div>

          {/* Dependencies */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">前置依赖</p>
            <div className="flex flex-wrap gap-2">
              {info.dependencies.map((dep) => (
                <Badge key={dep} variant="outline" className="text-xs">
                  {dep}
                </Badge>
              ))}
            </div>
          </div>

          {/* Data Preview */}
          {previewData.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">数据预览</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewData.map((item) => (
                  <div key={item.label} className="bg-muted/30 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold tabular-nums">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview items list */}
      {storyboards.length > 0 && stepKey !== 'merge' && stepKey !== 'export' && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">待处理分镜</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {storyboards.map((sb) => {
                let itemStatus: 'ready' | 'waiting' = 'waiting';
                let statusLabel = '等待中';

                if (stepKey === 'video_gen') {
                  if (sb.composedImage) {
                    itemStatus = 'ready';
                    statusLabel = sb.videoUrl ? '已完成' : '可处理';
                  }
                } else if (stepKey === 'tts') {
                  if (sb.dialogue) {
                    itemStatus = 'ready';
                    statusLabel = '可处理';
                  }
                } else if (stepKey === 'compose') {
                  if (sb.composedImage) {
                    itemStatus = 'ready';
                    statusLabel = '可处理';
                  }
                }

                return (
                  <div
                    key={sb.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      itemStatus === 'ready'
                        ? 'bg-green-500'
                        : 'bg-muted-foreground/20'
                    }`} />
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      #{sb.storyboardNumber}
                    </Badge>
                    <span className="flex-1 truncate text-sm">
                      {sb.title || `分镜 ${sb.storyboardNumber}`}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-xs shrink-0 ${
                        itemStatus === 'ready'
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
