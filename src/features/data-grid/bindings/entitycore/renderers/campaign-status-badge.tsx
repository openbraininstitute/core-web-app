'use client';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { executionStatusIconMap } from '@/components/icons/activity-execution';
import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** Semantic tone for a campaign's aggregated status. */
export const CampaignStatusTone = {
  Success: 'success',
  Destructive: 'destructive',
  Primary: 'primary',
  Neutral: 'neutral',
} as const;

export type TCampaignStatusTone = (typeof CampaignStatusTone)[keyof typeof CampaignStatusTone];

export interface ICampaignStatusBadgeSpec {
  label: string;
  tone: TCampaignStatusTone;
  /** light pill background */
  bg: string;
  /** full-colour border */
  border: string;
  /** full-colour text */
  text: string;
  /** full-colour chip behind the (white) icon glyph */
  chip: string;
}

/**
 * Status → badge presentation. Every status shares one shape — light background,
 * full-colour border/text, white glyph on a full-colour chip — only the hue changes.
 */
const STATUS_BADGE: Record<ActivityStatus, ICampaignStatusBadgeSpec> = {
  [ActivityStatus.DONE]: {
    label: 'Done',
    tone: CampaignStatusTone.Success,
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-700',
    chip: 'bg-green-500',
  },
  [ActivityStatus.ERROR]: {
    label: 'Error',
    tone: CampaignStatusTone.Destructive,
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-700',
    chip: 'bg-red-500',
  },
  [ActivityStatus.RUNNING]: {
    label: 'Running',
    tone: CampaignStatusTone.Primary,
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-700',
    chip: 'bg-blue-500',
  },
  [ActivityStatus.PENDING]: {
    label: 'Pending',
    tone: CampaignStatusTone.Neutral,
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-700',
    chip: 'bg-amber-500',
  },
  [ActivityStatus.CREATED]: {
    label: 'Generated',
    tone: CampaignStatusTone.Neutral,
    bg: 'bg-slate-50',
    border: 'border-slate-400',
    text: 'text-slate-600',
    chip: 'bg-slate-400',
  },
  // Charcoal, not another light grey: CREATED is the other neutral, and the two sit
  // side by side in a mixed pill where no label separates them.
  [ActivityStatus.CANCELLED]: {
    label: 'Cancelled',
    tone: CampaignStatusTone.Neutral,
    bg: 'bg-zinc-100',
    border: 'border-zinc-600',
    text: 'text-zinc-700',
    chip: 'bg-zinc-600',
  },
};

const FALLBACK_BADGE: ICampaignStatusBadgeSpec = {
  label: 'Unknown',
  tone: CampaignStatusTone.Neutral,
  bg: 'bg-gray-50',
  border: 'border-gray-300',
  text: 'text-gray-600',
  chip: 'bg-gray-400',
};

/**
 * Resolve the badge presentation for an {@link ActivityStatus}; unknown values degrade
 * to a neutral pill.
 */
export function getCampaignStatusBadgeSpec(
  status: ActivityStatus | undefined
): ICampaignStatusBadgeSpec {
  if (!status) return FALLBACK_BADGE;
  return STATUS_BADGE[status] ?? FALLBACK_BADGE;
}

/**
 * Headline-status precedence: active work first, then failures, then done — so a
 * finished campaign with one failed member reads "Error", not "Done".
 */
const STATUS_PRECEDENCE: ActivityStatus[] = [
  ActivityStatus.RUNNING,
  ActivityStatus.PENDING,
  ActivityStatus.CREATED,
  ActivityStatus.ERROR,
  ActivityStatus.CANCELLED,
  ActivityStatus.DONE,
];

/**
 * Collapse a status → member-count map into the single headline status shown by the
 * badge; `undefined` when the campaign has no members.
 */
export function aggregateCampaignStatus(
  statusCountMap: Map<ActivityStatus, number> | undefined | null
): ActivityStatus | undefined {
  if (!statusCountMap || statusCountMap.size === 0) return undefined;
  return STATUS_PRECEDENCE.find((status) => (statusCountMap.get(status) ?? 0) > 0);
}

/** Lifecycle order used when a campaign's members span several statuses. */
const STATUS_DISPLAY_ORDER: ActivityStatus[] = [
  ActivityStatus.CREATED,
  ActivityStatus.PENDING,
  ActivityStatus.RUNNING,
  ActivityStatus.DONE,
  ActivityStatus.ERROR,
  ActivityStatus.CANCELLED,
];

export interface ICampaignStatusCount {
  status: ActivityStatus;
  count: number;
}

/**
 * Non-empty status buckets in lifecycle order. More than one entry means the campaign is
 * mixed, and the cell shows per-status counts instead of a single headline label.
 */
export function getCampaignStatusBreakdown(
  statusCountMap: Map<ActivityStatus, number> | undefined | null
): ICampaignStatusCount[] {
  if (!statusCountMap || statusCountMap.size === 0) return [];
  return STATUS_DISPLAY_ORDER.flatMap((status) => {
    const count = statusCountMap.get(status) ?? 0;
    return count > 0 ? [{ status, count }] : [];
  });
}

/** "4 Generated, 2 Done" — the breakdown read out for assistive tech. */
export function describeCampaignStatusBreakdown(breakdown: ICampaignStatusCount[]): string {
  return breakdown
    .map(({ status, count }) => `${count} ${getCampaignStatusBadgeSpec(status).label}`)
    .join(', ');
}

/**
 * Most segments the pill will draw. Four `count + glyph` segments plus the cell's own
 * padding is about as much as the Status column's floor affords; past that the pill
 * would be clipped, silently eating a digit.
 */
const MAX_VISIBLE_SEGMENTS = 4;

export interface ICampaignStatusSegments {
  /** buckets the pill draws, in lifecycle order */
  visible: ICampaignStatusCount[];
  /** buckets omitted to keep the pill inside its cell */
  hidden: ICampaignStatusCount[];
}

/**
 * Split a breakdown into what the pill can draw and what it must leave to the tooltip.
 * A breakdown that already fits is returned whole.
 *
 * Failures are never hidden — a single ERROR is the one bucket a reader must not miss —
 * and the remaining slots go to the largest buckets, so the pill still reflects where the
 * campaign's members actually are.
 */
export function splitCampaignStatusSegments(
  breakdown: ICampaignStatusCount[]
): ICampaignStatusSegments {
  if (breakdown.length <= MAX_VISIBLE_SEGMENTS) return { visible: breakdown, hidden: [] };

  // one slot goes to the overflow marker, so keep one fewer than the cap
  const slots = MAX_VISIBLE_SEGMENTS - 1;
  const byCount = [...breakdown].sort((a, b) => b.count - a.count);
  const pinned = breakdown.filter((bucket) => bucket.status === ActivityStatus.ERROR);
  const keep = new Set(pinned.map((bucket) => bucket.status));
  for (const bucket of byCount) {
    if (keep.size >= slots) break;
    keep.add(bucket.status);
  }

  return {
    visible: breakdown.filter((bucket) => keep.has(bucket.status)),
    hidden: breakdown.filter((bucket) => !keep.has(bucket.status)),
  };
}

interface CampaignStatusCountsProps {
  breakdown: ICampaignStatusCount[];
  className?: string;
}

/**
 * Count-per-status pill for a mixed campaign — one `N ⟨glyph⟩` segment per status, in
 * lifecycle order. Labels are dropped: with several statuses no single one is the truth.
 *
 * The pill sizes to its content and never exceeds the cell: past
 * {@link MAX_VISIBLE_SEGMENTS} buckets the tail collapses into an ellipsis segment, and
 * the full breakdown stays in the `aria-label` and the hover popover.
 */
export function CampaignStatusCounts({ breakdown, className }: CampaignStatusCountsProps) {
  const { visible, hidden } = splitCampaignStatusSegments(breakdown);

  return (
    <Badge
      rounded
      size="sm"
      variant="outline"
      aria-label={describeCampaignStatusBreakdown(breakdown)}
      className={cn(
        'max-w-full select-none gap-0 divide-x divide-neutral-200 border-neutral-300 bg-white px-0 font-semibold',
        className
      )}
    >
      {visible.map(({ status, count }) => {
        const spec = getCampaignStatusBadgeSpec(status);
        return (
          <span key={status} className={cn('inline-flex items-center gap-0.5 px-1.5', spec.text)}>
            <span>{count}</span>
            <span
              className={cn(
                'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full text-white [&_svg]:size-2',
                spec.chip
              )}
            >
              {executionStatusIconMap[status]}
            </span>
          </span>
        );
      })}
      {hidden.length > 0 ? (
        <span className="inline-flex items-center px-1.5 text-neutral-500" aria-hidden>
          …
        </span>
      ) : null}
    </Badge>
  );
}

interface CampaignStatusBadgeProps {
  status: ActivityStatus | undefined;
  /** total member count, appended as a subtle "×N" suffix when > 1 */
  count?: number;
  /** smaller + lighter pill (used inside the scan-parameter cards). */
  compact?: boolean;
  /** give every status the SAME width so the cell column reads uniformly. */
  fixedWidth?: boolean;
  className?: string;
}

/** Presentational status pill for the campaign "Status" column. */
export function CampaignStatusBadge({
  status,
  count,
  compact = false,
  fixedWidth = false,
  className,
}: CampaignStatusBadgeProps): ReactNode {
  const spec = getCampaignStatusBadgeSpec(status);
  const icon = status ? executionStatusIconMap[status] : undefined;

  return (
    <Badge
      rounded
      size="sm"
      variant="outline"
      className={cn(
        'select-none border',
        spec.bg,
        spec.border,
        spec.text,
        compact ? 'h-[18px] gap-1 px-1.5 py-0 text-[9px] font-medium' : 'gap-1.5 font-semibold',
        fixedWidth ? 'min-w-[7.5rem] justify-center' : '',
        className
      )}
    >
      {icon ? (
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full text-white',
            spec.chip,
            compact ? 'size-3 [&_svg]:size-2' : 'size-4 [&_svg]:size-2.5'
          )}
        >
          {icon}
        </span>
      ) : null}
      <span>{spec.label}</span>
      {!compact && typeof count === 'number' && count > 1 ? (
        <span className="opacity-60">×{count}</span>
      ) : null}
    </Badge>
  );
}

/** Skeleton matching the fixed-width badge footprint. */
export function CampaignStatusBadgeSkeleton(): ReactNode {
  return <span className="inline-block h-6 w-[7.5rem] animate-pulse rounded-full bg-neutral-200" />;
}
