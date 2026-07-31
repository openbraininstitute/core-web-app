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
 * Props for the GENERALIZED status-badge popover. Both data sources are INJECTED so
 * the same cell works for ANY activity/campaign type (simulation campaigns, task
 * campaigns, ion-channel modeling, …), not just the hard-wired simulation-campaign:
 *
 * Status source — supply exactly one:
 *  - {@link statusCountMap}: a pre-resolved `status → count` map (SYNC sources that
 *    already have the aggregate in hand, e.g. task/ion-channel campaign rows); OR
 *  - {@link fetchStatus}: an async fetcher, polled while a member is PENDING/RUNNING
 *    (ASYNC sources that resolve the aggregate over the network).
 *
 * Scan source (optional) — {@link fetchScanRows} lazily loads the scan-parameter sets
 * shown as hover cards. When omitted the cell renders a plain badge with NO popover
 * (types that have no per-member scan parameters). The fetcher must return rows in the
 * loose `{ id, name, status, scan_parameters }` shape that {@link CampaignScanCards}
 * (via `toScanCardData`) consumes.
 */
export interface CampaignStatusBadgePopoverProps {
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

/**
 * New default "Status" cell renderer for the simulation-campaign listings. Binds the
 * workspace and the simulation-campaign status/scan fetchers into the generalized
 * {@link CampaignStatusBadgePopover}, preserving the original behaviour for every
 * registered circuit-sim schema (badge polled while active + hover cards of the
 * campaign's scan-parameter sets, fetched lazily on first open).
 */
export function CampaignStatusCell({
  row,
}: CellRendererProps<{ id?: string | null; name?: string | null }>): ReactNode {
  const campaignId = row?.id ?? undefined;
  if (!campaignId) return null;
  return <SimulationCampaignStatusCell campaignId={campaignId} simName={row?.name ?? undefined} />;
}

/**
 * Simulation-campaign binding of the generalized cell: wires `useWorkspace` +
 * `simulation-campaign`'s `status` / `rows` domain fetchers into the shared popover.
 */
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
 * The generalized status badge + hover-cards popover. Renders the aggregated activity
 * status as a coloured {@link CampaignStatusBadge} and, when a scan fetcher is
 * supplied, reveals the scan-parameter sets as a responsive grid of {@link CampaignScanCards}
 * on hover. Neither the status source nor the scan source is hard-wired — the caller
 * injects them (see {@link CampaignStatusBadgePopoverProps}), so this single component
 * serves every campaign/activity type.
 *
 * - SYNC status (`statusCountMap`): rendered immediately, no polling, no skeleton.
 * - ASYNC status (`fetchStatus`): polled while a member is PENDING/RUNNING; shows a
 *   {@link CampaignStatusBadgeSkeleton} until the first result resolves.
 * - Scan rows are fetched lazily on first popover open (React-Query cached); the
 *   popover content is not mounted until the badge is hovered.
 */
export function CampaignStatusBadgePopover({
  statusCountMap: providedMap,
  fetchStatus,
  statusQueryKey,
  fetchScanRows,
  scanQueryKey,
  title,
  enabled = true,
}: CampaignStatusBadgePopoverProps): ReactNode {
  const [open, setOpen] = useState(false);
  const hasProvidedMap = providedMap !== undefined;
  const isAsync = !hasProvidedMap && Boolean(fetchStatus);

  // Aggregated status — polled while active (ASYNC sources). Always called (rules of
  // hooks); disabled for SYNC sources so it never touches the network.
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

  // Scan-parameter sets — fetched lazily, only once the popover has been opened.
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

  // ASYNC sources show a skeleton until the first aggregate resolves.
  if (isAsync && (isLoading || !statusCountMap)) {
    return <CampaignStatusBadgeSkeleton />;
  }

  const headline = aggregateCampaignStatus(statusCountMap);
  const count = statusCountMap
    ? Array.from(statusCountMap.values()).reduce((sum, n) => sum + n, 0)
    : 0;

  const badge = <CampaignStatusBadge status={headline} count={count} fixedWidth />;

  // No scan fetcher → plain badge, no hover popover (types without scan parameters).
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
