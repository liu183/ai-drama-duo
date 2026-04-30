'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface AIProcessingPanelProps {
  steps: { text: string; done: boolean; elapsed: string }[];
  totalSteps: number;
  done: boolean;
  resultPreview: string;
}

export function AIProcessingPanel({
  steps,
  totalSteps,
  done,
  resultPreview,
}: AIProcessingPanelProps) {
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
