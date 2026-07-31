'use client';

import { useQuery } from '@tanstack/react-query';
import { Popover } from 'antd';
import { useState } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  rows as fetchCampaignScanRows,
  status as fetchCampaignStatus,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import {
  TASK_STATUS_POLL_INTERVAL_MS,
  TASK_STATUS_QUERY_KEY_HEAD,
} from '@/features/task-runner/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import { CampaignScanCards } from './campaign-scan-cards';
import {
  aggregateCampaignStatus,
  CampaignStatusBadge,
  CampaignStatusBadgeSkeleton,
} from './campaign-status-badge';

import type { ReactNode } from 'react';
import type { CellRendererProps } from '../../../react';

/** Cell-renderer registry key for the campaign/simulation aggregated status cell. */
export const CAMPAIGN_STATUS_RENDERER = 'campaignStatus';

const ACTIVE_STATUSES = [ActivityStatus.PENDING, ActivityStatus.RUNNING];

/**
 * New default "Status" cell for the simulation-campaign listings. Renders the
 * aggregated activity status as a coloured {@link CampaignStatusBadge} (polled while a
 * member is PENDING/RUNNING, mirroring the legacy status source) and, on hover, reveals
 * the campaign's scan-parameter sets as a responsive grid of cards in a popover. The
 * scan rows are fetched lazily on first open (React-Query cached) — the popover content
 * is NOT mounted until the user hovers the badge.
 */
export function CampaignStatusCell({
  row,
}: CellRendererProps<{ id?: string | null; name?: string | null }>): ReactNode {
  const campaignId = row?.id ?? undefined;
  if (!campaignId) return null;
  return <CampaignStatusBadgePopover campaignId={campaignId} simName={row?.name ?? undefined} />;
}

interface CampaignStatusBadgePopoverProps {
  campaignId: string;
  simName?: string;
}

function CampaignStatusBadgePopover({
  campaignId,
  simName,
}: CampaignStatusBadgePopoverProps): ReactNode {
  const { virtualLabId, projectId } = useWorkspace();
  const workspace = { virtualLabId, projectId };
  const enabled = Boolean(campaignId && virtualLabId && projectId);
  const [open, setOpen] = useState(false);

  // Aggregated status — same source as the legacy status cell, polled while active.
  const { data: statusCountMap, isLoading } = useQuery({
    queryKey: [TASK_STATUS_QUERY_KEY_HEAD, { campaignId, context: workspace }],
    queryFn: () => fetchCampaignStatus({ id: campaignId, context: workspace }),
    enabled,
    refetchInterval: (query) => {
      const values = Array.from(query.state.data?.keys() ?? []);
      return values.some((value) => ACTIVE_STATUSES.includes(value))
        ? TASK_STATUS_POLL_INTERVAL_MS
        : false;
    },
  });

  // Scan-parameter sets — fetched lazily, only once the popover has been opened.
  const {
    data: scanRows,
    isLoading: scanLoading,
    error: scanError,
  } = useQuery({
    queryKey: ['campaign-scan-rows', { campaignId, context: workspace }],
    queryFn: () => fetchCampaignScanRows({ id: campaignId, context: workspace }),
    enabled: enabled && open,
    staleTime: 30_000,
  });

  if (isLoading || !statusCountMap) {
    return <CampaignStatusBadgeSkeleton />;
  }

  const headline = aggregateCampaignStatus(statusCountMap);
  const count = Array.from(statusCountMap.values()).reduce((sum, n) => sum + n, 0);

  return (
    <div className="flex w-full items-center justify-center">
      <Popover
        trigger="hover"
        placement="bottomRight"
        mouseEnterDelay={0.15}
        mouseLeaveDelay={0.2}
        open={open}
        onOpenChange={setOpen}
        destroyOnHidden
        classNames={{ root: '[&_.ant-popover-inner]:p-2!' }}
        content={
          <CampaignScanCards
            records={scanRows}
            title={`${simName ?? 'Simulation'} execution status`}
            loading={scanLoading}
            error={scanError}
          />
        }
      >
        <button type="button" className="inline-flex cursor-default border-0 bg-transparent p-0">
          <CampaignStatusBadge status={headline} count={count} fixedWidth />
        </button>
      </Popover>
    </div>
  );
}
