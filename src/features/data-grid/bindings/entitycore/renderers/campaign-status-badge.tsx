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
  [ActivityStatus.CANCELLED]: {
    label: 'Cancelled',
    tone: CampaignStatusTone.Neutral,
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-600',
    chip: 'bg-gray-400',
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
