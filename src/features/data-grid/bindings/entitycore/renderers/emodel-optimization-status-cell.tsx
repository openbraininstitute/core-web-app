'use client';

import { Task } from '@/entity-configuration/domain/task-functions';
import { CampaignStatusBadgePopover } from '@/features/data-grid/bindings/entitycore/renderers/campaign-status-cell';
import { EMPTY_PLACEHOLDER } from '@/features/data-grid/renderers/aggrid/empty-cell';
import { TASK_STATUS_QUERY_KEY_HEAD } from '@/features/task-runner/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { ReactNode } from 'react';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { ICellRendererProps } from '@/features/data-grid/react';

/** Cell-renderer registry key for the e-model optimisation campaign status cell. */
export const EMODEL_OPTIMIZATION_STATUS_RENDERER = 'emodelOptimizationStatus';

/**
 * "Status" cell for the e-model optimisation campaign listing. A campaign is a `task_config`,
 * so its run status is not the simulation-campaign one (that walks simulation children a task
 * config has none of). It is instead the campaign's own task-activity status
 * ({@link Task.status}): generated configs → their latest executions, aggregated — the same
 * source the Workflows > Optimize table reads.
 */
export function EModelOptimizationCampaignStatusCell({
  row,
}: ICellRendererProps<{ id?: string | null }>): ReactNode {
  const { virtualLabId, projectId } = useWorkspace();
  const campaignId = row?.id ?? undefined;

  if (!campaignId) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;

  const context = { virtualLabId, projectId };
  const enabled = Boolean(campaignId && virtualLabId && projectId);

  return (
    <CampaignStatusBadgePopover
      fetchStatus={(): Promise<Map<ActivityStatus, number>> => Task.status({ campaignId, context })}
      statusQueryKey={[TASK_STATUS_QUERY_KEY_HEAD, 'emodel-optimization', { campaignId, context }]}
      enabled={enabled}
    />
  );
}
