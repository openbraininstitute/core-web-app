'use client';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { executionStatusIconMap } from '@/components/icons/activity-execution';
import { Badge, STATUS_PILL_CLASS } from '@/ui/molecules/badge';
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

export function getCampaignStatusBreakdown(
  statusCountMap: Map<ActivityStatus, number> | undefined | null
): ICampaignStatusCount[] {
  if (!statusCountMap || statusCountMap.size === 0) return [];
  return STATUS_DISPLAY_ORDER.flatMap((status) => {
    const count = statusCountMap.get(status) ?? 0;
    return count > 0 ? [{ status, count }] : [];
  });
}

export function describeCampaignStatusBreakdown(breakdown: ICampaignStatusCount[]): string {
  return breakdown
    .map(({ status, count }) => `${count} ${getCampaignStatusBadgeSpec(status).label}`)
    .join(', ');
}

const MAX_VISIBLE_SEGMENTS = 4;

export const CAMPAIGN_STATUS_COLUMN_MIN_WIDTH = 190;

export interface ICampaignStatusSegments {
  /** drawn by the pill, in lifecycle order */
  visible: ICampaignStatusCount[];
  /** left to the tooltip */
  hidden: ICampaignStatusCount[];
}

export function splitCampaignStatusSegments(
  breakdown: ICampaignStatusCount[]
): ICampaignStatusSegments {
  if (breakdown.length <= MAX_VISIBLE_SEGMENTS) return { visible: breakdown, hidden: [] };

  const ranked = [...breakdown].sort((a, b) => {
    if (a.status === ActivityStatus.ERROR) return -1;
    if (b.status === ActivityStatus.ERROR) return 1;
    return b.count - a.count;
  });
  const keep = new Set(ranked.slice(0, MAX_VISIBLE_SEGMENTS - 1).map((bucket) => bucket.status));

  return {
    visible: breakdown.filter((bucket) => keep.has(bucket.status)),
    hidden: breakdown.filter((bucket) => !keep.has(bucket.status)),
  };
}

interface CampaignStatusCountsProps {
  breakdown: ICampaignStatusCount[];
  className?: string;
}

export function CampaignStatusCounts({ breakdown, className }: CampaignStatusCountsProps) {
  const { visible, hidden } = splitCampaignStatusSegments(breakdown);

  return (
    <Badge
      rounded
      size="sm"
      variant="outline"
      role="img"
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
        <span className="inline-flex items-center px-1.5 text-neutral-500">…</span>
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
        STATUS_PILL_CLASS,
        spec.bg,
        spec.border,
        spec.text,
        // the compact pill leaves the shared footprint on purpose (scan-parameter cards)
        compact ? 'h-[18px] gap-1 px-1.5 py-0 text-[9px] font-medium' : 'gap-1.5',
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
