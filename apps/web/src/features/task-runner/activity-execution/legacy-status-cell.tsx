'use client';

import { useQuery } from '@tanstack/react-query';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { status } from '@/entity-configuration/domain/simulation/simulation-campaign';
import {
  ActivityAggregatedStatus,
  ActivityAggregatedStatusSkeleton,
} from '@/features/task-runner/activity-execution/status';
import {
  TASK_STATUS_POLL_INTERVAL_MS,
  TASK_STATUS_QUERY_KEY_HEAD,
} from '@/features/task-runner/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { WorkspaceContext } from '@/types/common';

type Props = {
  campaignId: string;
  context?: WorkspaceContext;
};

const ACTIVE_STATUSES = [ActivityStatus.PENDING, ActivityStatus.RUNNING];

export function LegacyCampaignStatusCell({ campaignId, context }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const workspace = context ?? { virtualLabId, projectId };

  const { data: statusCountMap, isLoading } = useQuery({
    queryKey: [TASK_STATUS_QUERY_KEY_HEAD, { campaignId, context: workspace }],
    queryFn: () => status({ id: campaignId, context: workspace }),
    enabled: Boolean(campaignId && workspace.virtualLabId && workspace.projectId),
    refetchInterval: (query) => {
      const values = Array.from(query.state.data?.keys() ?? []);
      return values.some((value) => ACTIVE_STATUSES.includes(value))
        ? TASK_STATUS_POLL_INTERVAL_MS
        : false;
    },
  });

  if (isLoading || !statusCountMap) {
    return <ActivityAggregatedStatusSkeleton />;
  }

  return <ActivityAggregatedStatus statusCountMap={statusCountMap} />;
}
