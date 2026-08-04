'use client';

import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

import { EMPTY_PLACEHOLDER } from '../columns/catalog';

import type { ReactNode } from 'react';
import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for the shared lifecycle-status pill. */
export const LIFECYCLE_STATUS_RENDERER = 'lifecycleStatus';

/**
 * Entitycore's lifecycle-status enum in the `{ key, label }` shape the grid's
 * `staticOptions` helpers read, so display labels and filter options cannot drift.
 * (`shared/global` has a bare key → wire-value map, which carries no labels.)
 */
export const EntityLifecycleStatus = {
  Draft: { key: 'draft', label: 'Draft' },
  Active: { key: 'active', label: 'Active' },
  Disqualified: { key: 'disqualified', label: 'Disqualified' },
} as const;

/** Semantic tone for one lifecycle status. */
const LifecycleStatusTone = {
  Neutral: 'neutral',
  Success: 'success',
  Destructive: 'destructive',
} as const;

type TLifecycleStatusTone = (typeof LifecycleStatusTone)[keyof typeof LifecycleStatusTone];

interface ILifecycleStatusBadgeSpec {
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
  [EntityLifecycleStatus.Draft.key]: {
    label: EntityLifecycleStatus.Draft.label,
    tone: LifecycleStatusTone.Neutral,
    bg: 'bg-slate-50',
    border: 'border-slate-400',
    text: 'text-slate-600',
  },
  [EntityLifecycleStatus.Active.key]: {
    label: EntityLifecycleStatus.Active.label,
    tone: LifecycleStatusTone.Success,
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-700',
  },
  [EntityLifecycleStatus.Disqualified.key]: {
    label: EntityLifecycleStatus.Disqualified.label,
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
  status: string | null | undefined
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

interface ILifecycleStatusRow {
  lifecycle_status?: string | null;
}

/** Shared lifecycle-status cell; falls through to the empty placeholder if absent. */
export function LifecycleStatusCell({
  row,
}: ICellRendererProps<ILifecycleStatusRow>): ReactNode | null {
  const spec = getLifecycleStatusBadgeSpec(row?.lifecycle_status);
  if (!spec) return EMPTY_PLACEHOLDER;

  return (
    <Badge
      rounded
      size="sm"
      variant="outline"
      className={cn('select-none border font-semibold h-6!', spec.bg, spec.border, spec.text)}
    >
      {spec.label}
    </Badge>
  );
}
