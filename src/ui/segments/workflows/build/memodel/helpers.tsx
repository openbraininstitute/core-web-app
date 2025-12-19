'use client';

import type { ReactNode } from 'react';
import type { ICellMorphology, IEModel } from '@/api/entitycore/types';
import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import { useSessionStorage } from '@/hooks/use-session-storage';
import { cn } from '@/utils/css-class';

export const BuildStep = {
  Info: 'info',
  MModel: 'm-model',
  EModel: 'e-model',
} as const;
export type BuildStepKeys = (typeof BuildStep)[keyof typeof BuildStep];

export const useBuildMeModelSessionState = ({
  sessionId,
  virtualLabId,
  projectId,
}: {
  sessionId: string;
  virtualLabId: string;
  projectId: string;
}) => {
  const { setSessionValue, removeSessionValue, sessionValue } = useSessionStorage<{
    virtualLabId: string;
    projectId: string;
    name?: string;
    description?: string;
    brainRegion?: BrainRegionHierarchyBase;
    mmodel?: ICellMorphology;
    emodel?: IEModel;
  }>(sessionId, {
    virtualLabId,
    projectId,
  });

  return {
    setSessionValue,
    removeSessionValue,
    sessionValue,
  };
};

export const label = (text: string, type: 'main' | 'secondary' = 'main', extra?: ReactNode) => (
  <span
    className={cn(
      'text-base font-light uppercase',
      type === 'main' && 'text-primary-8 !font-bold',
      type === 'secondary' && 'text-label',
    )}
  >
    {text} {extra}
  </span>
);
