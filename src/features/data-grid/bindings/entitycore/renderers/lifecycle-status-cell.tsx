'use client';

import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for the shared lifecycle-status pill. */
export const LIFECYCLE_STATUS_RENDERER = 'lifecycleStatus';

/**
 * `EntityLifecycleStatus` — entitycore's `app/db/types.py` enum, declared here in the
 * `{ key, label }` shape the grid's `staticOptions` / `dictLabelByKey` helpers read, so
 * a column's display labels and its filter options cannot drift apart.
 *
 * A dict used BY MEMBER (`EntityLifecycleStatus.Active.key`), never by literal — see
 * the naming rules in GUIDE.md §5.9. `@/api/entitycore/types/shared/global` declares a
 * bare `key → wire value` map of the same enum for its `IEntityLifecycleStatus` row
 * interface; that shape carries no labels, so it cannot drive a picker.
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

/**
 * Status → pill presentation. Same template as {@link CampaignStatusBadge}: a LIGHT
 * background with a FULL-colour border and text, never a solid fill. The hues mirror
 * the legacy antd `Tag` colours the lifecycle-status PR chose (`default` / `success` /
 * `error`) without importing antd into this feature.
 */
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
 * Resolve the pill presentation for a wire value. An unrecognised status degrades to a
 * neutral pill showing the raw value rather than throwing or rendering nothing — the
 * backend can add an enum member before the frontend knows about it.
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

/**
 * Shared lifecycle-status cell. `lifecycle_status` is non-null on every entitycore
 * read schema (`EntityBaseReadMixin`), but the cell still tolerates its absence and
 * falls through to the grid's shared empty placeholder.
 */
export function LifecycleStatusCell({
  row,
}: ICellRendererProps<ILifecycleStatusRow>): ReactNode | null {
  const spec = getLifecycleStatusBadgeSpec(row?.lifecycle_status);
  if (!spec) return null;

  return (
    <Badge
      rounded
      size="sm"
      variant="outline"
      className={cn('select-none border font-semibold', spec.bg, spec.border, spec.text)}
    >
      {spec.label}
    </Badge>
  );
}
