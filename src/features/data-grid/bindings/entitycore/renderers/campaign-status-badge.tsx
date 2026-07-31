'use client';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { executionStatusIconMap } from '@/components/icons/activity-execution';
import { Badge } from '@/ui/molecules/badge';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** Semantic tone for a campaign's aggregated status. */
export type CampaignStatusTone = 'success' | 'destructive' | 'primary' | 'neutral';

export interface CampaignStatusBadgeSpec {
  label: string;
  tone: CampaignStatusTone;
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
 * Static status → badge presentation map. Every status follows the SAME shape (the
 * "Done" green template): a LIGHT background, a FULL-colour border + text, and the
 * icon glyph white inside a full-colour chip. Only the hue changes per status — no
 * status is a solid fill. Pure/data-only (the unit under test).
 */
const STATUS_BADGE: Record<ActivityStatus, CampaignStatusBadgeSpec> = {
  [ActivityStatus.DONE]: {
    label: 'Done',
    tone: 'success',
    bg: 'bg-green-50',
    border: 'border-green-500',
    text: 'text-green-700',
    chip: 'bg-green-500',
  },
  [ActivityStatus.ERROR]: {
    label: 'Error',
    tone: 'destructive',
    bg: 'bg-red-50',
    border: 'border-red-500',
    text: 'text-red-700',
    chip: 'bg-red-500',
  },
  [ActivityStatus.RUNNING]: {
    label: 'Running',
    tone: 'primary',
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    text: 'text-blue-700',
    chip: 'bg-blue-500',
  },
  [ActivityStatus.PENDING]: {
    label: 'Pending',
    tone: 'neutral',
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    text: 'text-amber-700',
    chip: 'bg-amber-500',
  },
  [ActivityStatus.CREATED]: {
    label: 'Generated',
    tone: 'neutral',
    bg: 'bg-slate-50',
    border: 'border-slate-400',
    text: 'text-slate-600',
    chip: 'bg-slate-400',
  },
  [ActivityStatus.CANCELLED]: {
    label: 'Cancelled',
    tone: 'neutral',
    bg: 'bg-gray-50',
    border: 'border-gray-400',
    text: 'text-gray-600',
    chip: 'bg-gray-400',
  },
};

const FALLBACK_BADGE: CampaignStatusBadgeSpec = {
  label: 'Unknown',
  tone: 'neutral',
  bg: 'bg-gray-50',
  border: 'border-gray-300',
  text: 'text-gray-600',
  chip: 'bg-gray-400',
};

/**
 * Resolve the {@link Badge} presentation for a single {@link ActivityStatus}. Unknown
 * values degrade to a neutral outline pill rather than throwing.
 */
export function getCampaignStatusBadgeSpec(
  status: ActivityStatus | undefined
): CampaignStatusBadgeSpec {
  if (!status) return FALLBACK_BADGE;
  return STATUS_BADGE[status] ?? FALLBACK_BADGE;
}

/**
 * Precedence for collapsing a multi-status count map into a single headline status.
 * Active work (running → pending → queued) surfaces first, then failures, then done —
 * so an in-flight campaign reads "Running", and a finished one with a failed member
 * reads "Error" rather than "Done".
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
 * Collapse an aggregated status count map (status → number of member simulations) into
 * the single headline {@link ActivityStatus} shown by the badge. Returns `undefined`
 * when the campaign has no members.
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

/** Presentational status pill — the new default look for the campaign "Status" column. */
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
        // light bg + full-colour border + full-colour text (the Done-green template for all)
        spec.bg,
        spec.border,
        spec.text,
        // compact = smaller footprint + lighter weight (for the card headers)
        compact ? 'h-[18px] gap-1 px-1.5 py-0 text-[9px] font-medium' : 'gap-1.5 font-semibold',
        // uniform width across statuses so the centred cell column isn't ragged
        fixedWidth ? 'min-w-[7.5rem] justify-center' : '',
        className
      )}
    >
      {icon ? (
        // full-colour chip with a WHITE glyph (the status icons are `currentColor`)
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

/** Rounded skeleton matching the (fixed-width) badge footprint — no loader icon. */
export function CampaignStatusBadgeSkeleton(): ReactNode {
  return <span className="inline-block h-6 w-[7.5rem] animate-pulse rounded-full bg-neutral-200" />;
}
