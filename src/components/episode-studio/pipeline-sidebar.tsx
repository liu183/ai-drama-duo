'use client';

import { Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PIPELINE_STEPS } from '@/lib/constants';
import type { Episode, Character, Storyboard } from '@/types';
import { getStepStatus } from './step-utils';

interface PipelineSidebarProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  episode: Episode;
  characters: Character[];
  storyboards: Storyboard[];
}

export function PipelineSidebar({
  currentStep,
  setCurrentStep,
  episode,
  characters,
  storyboards,
}: PipelineSidebarProps) {
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
