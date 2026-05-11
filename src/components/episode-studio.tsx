'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PanelRightOpen,
  PanelRightClose,
  Clapperboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  episodeApi,
  characterApi,
  sceneApi,
  storyboardApi,
  agentApi,
  dramaApi,
} from '@/lib/api';
import { PIPELINE_STEPS, AGENT_TYPES, AGENT_STEPS, STATUS_MAP } from '@/lib/constants';
import type { Episode, Character, Scene, Storyboard } from '@/types';

// Sub-components
import { PipelineSidebar } from './episode-studio/pipeline-sidebar';
import { StepHeader } from './episode-studio/step-header';
import { AIProcessingPanel } from './episode-studio/ai-processing-panel';
import { renderStepContent } from './episode-studio/render-step-content';
import { RightPanel } from './episode-studio/right-panel';
import { getStepStatus } from './episode-studio/step-utils';

// ==================== Props ====================

type StudioProps = {
  dramaId: string;
  episodeId: string;
  episodeNumber: number;
  onBack: () => void;
};

// ==================== Main Component ====================
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
  const [dramaTitle, setDramaTitle] = useState('');
  const [dramaMetadata, setDramaMetadata] = useState<Record<string, unknown> | null>(null);

  const mainContentRef = useRef<HTMLDivElement>(null);
  const aiTimerRef = useRef<NodeJS.Timeout[]>([]);

  // Ref for currentStep to avoid stale closure in auto-advance useEffect
  const currentStepRef = useRef(currentStep);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

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
      const [ep, chars, sceneList, sbList, dramaRes] = await Promise.all([
        episodeApi.get(episodeId),
        characterApi.list(dramaId),
        sceneApi.list(dramaId),
        storyboardApi.list(episodeId),
        dramaApi.get(dramaId).catch(() => null),
      ]);
      // API responses are wrapped in { data: ... }, unwrap them
      const epData = ep.data || ep;
      setEpisode(epData);
      setCharacters(Array.isArray(chars) ? chars : chars.data || chars.items || []);
      setScenes(Array.isArray(sceneList) ? sceneList : sceneList.data || sceneList.items || []);
      setStoryboards(Array.isArray(sbList) ? sbList : sbList.data || sbList.items || []);
      setRawContent(epData.content || '');
      // Extract drama title and metadata
      if (dramaRes) {
        const dramaData = dramaRes.data || dramaRes;
        setDramaTitle(dramaData.title || '');
        if (dramaData.metadata) {
          try {
            setDramaMetadata(JSON.parse(dramaData.metadata));
          } catch {
            setDramaMetadata(null);
          }
        }
      }
    } catch {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [episodeId, dramaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-advance to next available step (uses ref to avoid stale closure)
  useEffect(() => {
    if (!episode || characters.length === 0) return;
    const step = currentStepRef.current;
    if (episode.content && step === 0) setCurrentStep(1);
    if (episode.scriptContent && step <= 1) setCurrentStep(2);
    if (characters.length > 0 && step <= 2) setCurrentStep(3);
    if (characters.some(c => c.voiceStyle) && step <= 3) setCurrentStep(4);
    if (storyboards.length > 0 && step <= 4) setCurrentStep(5);
    if (storyboards.length > 0 && storyboards.every(s => s.imagePrompt) && step <= 5) setCurrentStep(6);
    if (storyboards.length > 0 && storyboards.every(s => s.videoPrompt) && step <= 6) setCurrentStep(7);
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
    (PIPELINE_STEPS.filter((s) => getStepStatus(s.key, episode || { content: '', scriptContent: '', status: 'draft', episodeNumber: 0, id: '', title: '', duration: 0 }, characters, storyboards) === 'done').length /
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
                      scenes,
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
                      dramaTitle,
                      dramaMetadata,
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
                  <RightPanel
                    episodeNumber={episodeNumber}
                    episode={episode}
                    characters={characters}
                    scenes={scenes}
                    storyboards={storyboards}
                  />
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
