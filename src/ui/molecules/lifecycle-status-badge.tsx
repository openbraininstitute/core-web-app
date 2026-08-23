import {
  EntityLifecycleStatus,
  EntityLifecycleStatusLabel,
  type TEntityLifecycleStatus,
} from '@/api/entitycore/types/shared/global';
import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export { EntityLifecycleStatus, EntityLifecycleStatusLabel };

/** Semantic tone for one lifecycle status. */
const LifecycleStatusTone = {
  Neutral: 'neutral',
  Success: 'success',
  Destructive: 'destructive',
} as const;

type TLifecycleStatusTone = (typeof LifecycleStatusTone)[keyof typeof LifecycleStatusTone];

export interface ILifecycleStatusBadgeSpec {
  label: string;
  tone: TLifecycleStatusTone;
  /** light pill background */
  bg: string;
  /** full-colour border */
  border: string;
  /** full-colour text */
  text: string;
}

/** Status → pill presentation: light background, full-colour border and text. */
const STATUS_BADGE: Record<string, ILifecycleStatusBadgeSpec> = {
  [EntityLifecycleStatus.Draft]: {
    label: EntityLifecycleStatusLabel[EntityLifecycleStatus.Draft],
    tone: LifecycleStatusTone.Neutral,
    bg: 'bg-slate-50',
    border: 'border-slate-400',
    text: 'text-slate-600',
  },
  [EntityLifecycleStatus.Active]: {
    label: EntityLifecycleStatusLabel[EntityLifecycleStatus.Active],
    tone: LifecycleStatusTone.Success,
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-700',
  },
  [EntityLifecycleStatus.Disqualified]: {
    label: EntityLifecycleStatusLabel[EntityLifecycleStatus.Disqualified],
    tone: LifecycleStatusTone.Destructive,
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-700',
  },
};

/**
 * Resolve the pill presentation for a wire value. An unrecognised status (the backend
 * may add enum members first) degrades to a neutral pill showing the raw value.
 */
export function getLifecycleStatusBadgeSpec(
  status: TEntityLifecycleStatus | string | null | undefined
): ILifecycleStatusBadgeSpec | undefined {
  if (!status) return undefined;
  return (
    STATUS_BADGE[status] ?? {
      label: status,
      tone: LifecycleStatusTone.Neutral,
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      text: 'text-gray-600',
    }
  );
}

/** The lifecycle-status pill, shared by the grid cell and the detail views. */
export function LifecycleStatusBadge({
  status,
  className,
}: {
  status: TEntityLifecycleStatus | string | null | undefined;
  className?: string;
}): ReactNode | null {
  const spec = getLifecycleStatusBadgeSpec(status);
  if (!spec) return null;

  return (
    <Badge
      rounded
      size="sm"
      variant="outline"
      className={cn(
        'select-none border font-semibold h-6!',
        spec.bg,
        spec.border,
        spec.text,
        className
      )}
    >
      {spec.label}
    </Badge>
  );
}
