'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PIPELINE_STEPS } from '@/lib/constants';
import type { StepStatus } from './step-utils';

type PipelineStep = (typeof PIPELINE_STEPS)[number];

interface StepHeaderProps {
  step: PipelineStep;
  status: StepStatus;
  onRunAgent: () => void;
  agentLoading: boolean;
  hasAgent: boolean;
}

export function StepHeader({
  step,
  status,
  onRunAgent,
  agentLoading,
  hasAgent,
}: StepHeaderProps) {
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
