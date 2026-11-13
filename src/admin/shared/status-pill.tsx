import { Badge, STATUS_PILL_CLASS } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

const TONES = {
  good: 'border-green-500 bg-green-50 text-green-700',
  bad: 'border-red-500 bg-red-50 text-red-700',
  warn: 'border-warning text-warning bg-white',
  neutral: 'border-neutral-2 text-neutral-4 bg-white',
};

export function StatusPill({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <Badge rounded variant="outline" className={cn(STATUS_PILL_CLASS, TONES[tone])}>
      {children}
    </Badge>
  );
}
