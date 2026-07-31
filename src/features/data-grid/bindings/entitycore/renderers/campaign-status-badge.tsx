'use client';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { executionStatusIconMap } from '@/components/icons/activity-execution';
import { Badge } from '@/ui/molecules/badge';

import type { VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import type { badgeVariants } from '@/ui/molecules/badge';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

/** Semantic tone for a campaign's aggregated status — drives colour + Badge variant. */
export type CampaignStatusTone = 'success' | 'destructive' | 'primary' | 'neutral';

export interface CampaignStatusBadgeSpec {
  label: string;
  tone: CampaignStatusTone;
  variant: BadgeVariant;
  /** colour overrides layered on top of the Badge variant */
  className: string;
}

/**
 * Static status → badge presentation map. Each {@link ActivityStatus} resolves to a
 * label, a semantic tone, a {@link Badge} variant and a colour className. This is the
 * unit under test for the "status → badge variant" mapping — keep it pure/data-only.
 */
const STATUS_BADGE: Record<ActivityStatus, CampaignStatusBadgeSpec> = {
  [ActivityStatus.CREATED]: {
    label: 'Generated',
    tone: 'neutral',
    variant: 'outline',
    className: 'border-neutral-3 bg-white text-primary-8',
  },
  [ActivityStatus.PENDING]: {
    label: 'Pending',
    tone: 'neutral',
    variant: 'outline',
    className: 'border-purple-300 bg-purple-50 text-purple-700',
  },
  [ActivityStatus.RUNNING]: {
    label: 'Running',
    tone: 'primary',
    variant: 'default',
    className: '',
  },
  [ActivityStatus.DONE]: {
    label: 'Done',
    tone: 'success',
    variant: 'outline',
    className: 'border-green-500 bg-green-50 text-green-700',
  },
  [ActivityStatus.ERROR]: {
    label: 'Error',
    tone: 'destructive',
    variant: 'destructive',
    className: '',
  },
  [ActivityStatus.CANCELLED]: {
    label: 'Cancelled',
    tone: 'neutral',
    variant: 'outline',
    className: 'border-neutral-4 bg-neutral-1 text-neutral-6',
  },
};

const FALLBACK_BADGE: CampaignStatusBadgeSpec = {
  label: 'Unknown',
  tone: 'neutral',
  variant: 'outline',
  className: 'border-neutral-3 bg-white text-neutral-6',
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
      variant={spec.variant}
      className={[
        'select-none',
        // compact = smaller footprint + lighter weight (for the card headers)
        compact ? 'h-[18px] gap-1 px-1.5 py-0 text-[9px] font-medium' : 'gap-1.5 font-semibold',
        // uniform width across statuses so the centred cell column isn't ragged
        fixedWidth ? 'min-w-[7.5rem] justify-center' : '',
        spec.className,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon ? (
        <span className={compact ? 'text-[10px] leading-none' : 'text-xs leading-none'}>
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

/** Loading placeholder matching the badge footprint. */
export function CampaignStatusBadgeSkeleton(): ReactNode {
  return <span className="h-6 w-20 animate-pulse rounded-full bg-neutral-200" />;
}
