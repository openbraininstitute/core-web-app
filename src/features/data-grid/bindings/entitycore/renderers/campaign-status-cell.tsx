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

import { EMPTY_PLACEHOLDER } from '../../../renderers/aggrid/empty-cell';
import { CampaignScanCards } from './campaign-scan-cards';
import {
  aggregateCampaignStatus,
  CampaignStatusBadge,
  CampaignStatusBadgeSkeleton,
} from './campaign-status-badge';

import type { ReactNode } from 'react';
import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for the campaign/simulation aggregated status cell. */
export const CAMPAIGN_STATUS_RENDERER = 'campaignStatus';

const ACTIVE_STATUSES = [ActivityStatus.PENDING, ActivityStatus.RUNNING];

/**
 * Props for the status-badge popover. Both data sources are injected, so one cell serves
 * any campaign/activity type. Supply exactly one status source — `statusCountMap` (sync)
 * or `fetchStatus` (async, polled). `fetchScanRows` is optional; without it the cell is
 * a plain badge with no popover, and its rows must be in the loose
 * `{ id, name, status, scan_parameters }` shape.
 */
export interface ICampaignStatusBadgePopoverProps {
  /** Pre-resolved aggregated status counts (SYNC sources). Wins over {@link fetchStatus}. */
  statusCountMap?: Map<ActivityStatus, number>;
  /** Async status fetcher, polled while a member is PENDING/RUNNING (ASYNC sources). */
  fetchStatus?: () => Promise<Map<ActivityStatus, number>>;
  /** React-Query key for the status poll (ASYNC sources). */
  statusQueryKey?: ReadonlyArray<unknown>;
  /** Lazily-invoked (on first popover open) scan-rows fetcher; loose card row shape. */
  fetchScanRows?: () => Promise<unknown[]>;
  /** React-Query key for the scan fetch. */
  scanQueryKey?: ReadonlyArray<unknown>;
  /** Popover heading, e.g. `"{name} execution status"`. */
  title?: string;
  /** Gate the status poll (ASYNC sources). Default: true. */
  enabled?: boolean;
}

/** "Status" cell renderer for the simulation-campaign listings. */
export function CampaignStatusCell({
  row,
}: ICellRendererProps<{ id?: string | null; name?: string | null }>): ReactNode {
  const campaignId = row?.id ?? undefined;
  if (!campaignId) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;
  return <SimulationCampaignStatusCell campaignId={campaignId} simName={row?.name ?? undefined} />;
}

/** Wires `useWorkspace` and the simulation-campaign fetchers into the shared popover. */
function SimulationCampaignStatusCell({
  campaignId,
  simName,
}: {
  campaignId: string;
  simName?: string;
}): ReactNode {
  const { virtualLabId, projectId } = useWorkspace();
  const workspace = { virtualLabId, projectId };
  const enabled = Boolean(campaignId && virtualLabId && projectId);

  return (
    <CampaignStatusBadgePopover
      fetchStatus={() => fetchCampaignStatus({ id: campaignId, context: workspace })}
      statusQueryKey={[TASK_STATUS_QUERY_KEY_HEAD, { campaignId, context: workspace }]}
      enabled={enabled}
      fetchScanRows={() => fetchCampaignScanRows({ id: campaignId, context: workspace })}
      scanQueryKey={['campaign-scan-rows', { campaignId, context: workspace }]}
      title={`${simName ?? 'Simulation'} execution status`}
    />
  );
}

/**
 * Aggregated status badge with a hover popover of scan-parameter cards. A sync
 * `statusCountMap` renders immediately; `fetchStatus` is polled while a member is
 * PENDING/RUNNING and shows a skeleton until the first result. Scan rows are fetched
 * lazily on first popover open.
 */
export function CampaignStatusBadgePopover({
  statusCountMap: providedMap,
  fetchStatus,
  statusQueryKey,
  fetchScanRows,
  scanQueryKey,
  title,
  enabled = true,
}: ICampaignStatusBadgePopoverProps): ReactNode {
  const [open, setOpen] = useState(false);
  const hasProvidedMap = providedMap !== undefined;
  const isAsync = !hasProvidedMap && Boolean(fetchStatus);

  // Always called (rules of hooks); disabled for sync sources so it never fetches.
  const { data: fetchedMap, isLoading } = useQuery({
    queryKey: statusQueryKey ?? ['campaign-status', title],
    queryFn: () =>
      fetchStatus ? fetchStatus() : Promise.resolve(new Map<ActivityStatus, number>()),
    enabled: isAsync && enabled,
    refetchInterval: (query) => {
      const values = Array.from(query.state.data?.keys() ?? []);
      return values.some((value) => ACTIVE_STATUSES.includes(value))
        ? TASK_STATUS_POLL_INTERVAL_MS
        : false;
    },
  });

  const {
    data: scanRows,
    isLoading: scanLoading,
    error: scanError,
  } = useQuery({
    queryKey: scanQueryKey ?? ['campaign-scan-rows', title],
    queryFn: () => (fetchScanRows ? fetchScanRows() : Promise.resolve([] as unknown[])),
    enabled: Boolean(fetchScanRows) && open,
    staleTime: 30_000,
  });

  const statusCountMap = hasProvidedMap ? providedMap : fetchedMap;

  if (isAsync && (isLoading || !statusCountMap)) {
    return <CampaignStatusBadgeSkeleton />;
  }

  const headline = aggregateCampaignStatus(statusCountMap);
  const count = statusCountMap
    ? Array.from(statusCountMap.values()).reduce((sum, n) => sum + n, 0)
    : 0;

  const badge = <CampaignStatusBadge status={headline} count={count} fixedWidth />;

  if (!fetchScanRows) {
    return <div className="flex w-full items-center justify-center">{badge}</div>;
  }

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
            title={title}
            loading={scanLoading}
            error={scanError}
          />
        }
      >
        <button type="button" className="inline-flex cursor-default border-0 bg-transparent p-0">
          {badge}
        </button>
      </Popover>
    </div>
  );
}
