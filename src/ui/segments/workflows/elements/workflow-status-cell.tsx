'use client';

import { get } from 'es-toolkit/compat';
import { match } from 'ts-pattern';

import { type EntityCoreObjectTypes, EntityTypeDict } from '@/api/entitycore/types';
import { type ITaskConfig, TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import {
  getStatusCountMap as getIonChannelModelingStatusCountMap,
  type TExtendedIonChannelModelingCampaignsType,
} from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import {
  rows as listSimulationRows,
  status as simulationCampaignStatus,
} from '@/entity-configuration/domain/simulation/simulation-campaign';
import {
  getTaskCampaignStatusCountMap,
  Task,
  type TTaskCampaignExecutionRow,
  type TTaskCampaignRow,
} from '@/entity-configuration/domain/task-functions';
import { CampaignStatusBadgePopover } from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-cell';
import { TASK_STATUS_QUERY_KEY_HEAD } from '@/features/task-runner/constants';
import { StatusMap } from '@/ui/segments/project/activities/elements/helpers';
import { cn } from '@/utils/css-class';

import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { WorkspaceContext } from '@/types/common';

type WorkflowTaskCampaignRow = TTaskCampaignRow<{
  scan_parameters: Record<string, unknown>;
}>;

/** Loose card-row shape shared by simulation + task scan rows (see `toScanCardData`). */
interface ScanCardRow {
  id: string;
  name: string;
  status?: ActivityStatus;
  scan_parameters: Record<string, unknown>;
}

/**
 * Project the task-campaign expand payload (`expandRow` → execution rows) into the loose
 * card-row shape the scan-cards popover reads: one card per distinct config (latest
 * execution status wins), surfacing that config's `meta.scan_parameters`. Replaces the
 * legacy nested scan-parameter table with the shared badge + hover cards popover.
 */
export function toTaskScanCardRows(
  rows: TTaskCampaignExecutionRow<{ scan_parameters?: Record<string, unknown> }>[]
): ScanCardRow[] {
  const byConfig = new Map<
    string,
    { row: TTaskCampaignExecutionRow<{ scan_parameters?: Record<string, unknown> }>; date?: string }
  >();
  for (const row of rows) {
    const configId = row.provenance.config.id;
    const date = row.execution?.creation_date ?? undefined;
    const prev = byConfig.get(configId);
    if (!prev || (date && (!prev.date || date > prev.date))) byConfig.set(configId, { row, date });
  }
  return Array.from(byConfig.values()).map(({ row }) => {
    const config = row.provenance.config;
    return {
      id: config.id,
      name: config.name,
      status: row.execution?.status as ActivityStatus | undefined,
      scan_parameters: config.meta?.scan_parameters ?? {},
    };
  });
}

/**
 * The generalized status cell for the activity listings (workflows activity table AND
 * the project activities table). Resolves each row's aggregated `status → count` map the
 * SAME way the legacy status column did (by `record.type`) and, for the expandable
 * campaign types, supplies the matching scan-rows fetcher so the badge's hover popover
 * shows the scan-parameter CARDS (replacing the old expandable rows). Non-campaign rows
 * keep the legacy single-status presentation.
 */
export function WorkflowStatusCell({
  record,
  workspace,
}: {
  record: EntityCoreObjectTypes;
  workspace: WorkspaceContext;
}) {
  const enabled = Boolean(record.id && workspace.virtualLabId && workspace.projectId);
  const statusQueryKey = [
    TASK_STATUS_QUERY_KEY_HEAD,
    { campaignId: record.id, context: workspace },
  ];
  const scanQueryKey = ['campaign-scan-rows', { campaignId: record.id, context: workspace }];

  return match({ type: record.type })
    .with({ type: EntityTypeDict.SimulationCampaign }, () => (
      <CampaignStatusBadgePopover
        fetchStatus={() => simulationCampaignStatus({ id: record.id, context: workspace })}
        statusQueryKey={statusQueryKey}
        enabled={enabled}
        fetchScanRows={() => listSimulationRows({ id: record.id, context: workspace })}
        scanQueryKey={scanQueryKey}
        title={`${record.name ?? 'Simulation'} execution status`}
      />
    ))
    .with({ type: EntityTypeDict.TaskConfig }, () => {
      const taskConfigType = (record as unknown as ITaskConfig<Record<string, unknown>>)
        .task_config_type;
      const isExpandableTask =
        taskConfigType === TaskConfigType.CircuitExtractionCampaign ||
        taskConfigType === TaskConfigType.SkeletonizationCampaign;

      if (isExpandableTask) {
        const expandRow =
          taskConfigType === TaskConfigType.SkeletonizationCampaign
            ? SkeletonizationCampaign.api.expandRow
            : CircuitExtractionCampaign.api.expandRow;
        return (
          <CampaignStatusBadgePopover
            fetchStatus={() =>
              Task.status({ campaignId: record.id, context: workspace }) as Promise<
                Map<ActivityStatus, number>
              >
            }
            statusQueryKey={statusQueryKey}
            enabled={enabled}
            fetchScanRows={
              expandRow
                ? async () => {
                    const taskRows = (await expandRow(
                      record as unknown as ITaskConfig<Record<string, unknown>>,
                      workspace
                    )) as TTaskCampaignExecutionRow<{
                      scan_parameters?: Record<string, unknown>;
                    }>[];
                    return toTaskScanCardRows(taskRows);
                  }
                : undefined
            }
            scanQueryKey={scanQueryKey}
            title={`${record.name ?? 'Campaign'} execution status`}
          />
        );
      }

      const statusCountMap = getTaskCampaignStatusCountMap(
        record as unknown as WorkflowTaskCampaignRow
      ) as unknown as Map<ActivityStatus, number>;
      return <CampaignStatusBadgePopover statusCountMap={statusCountMap} />;
    })
    .with({ type: EntityTypeDict.IonChannelModelingCampaign }, () => {
      const statusCountMap = getIonChannelModelingStatusCountMap(
        record as unknown as TExtendedIonChannelModelingCampaignsType['data'][number]
      ) as unknown as Map<ActivityStatus, number>;
      return <CampaignStatusBadgePopover statusCountMap={statusCountMap} />;
    })
    .otherwise(() => {
      const status = get(record, 'status', 'default');
      const mapper = get(StatusMap, status, null);
      return (
        <span className={cn('text-primary-9 flex items-center capitalize', mapper?.class)}>
          {mapper?.icon}
          {mapper?.title}
        </span>
      );
    });
}
