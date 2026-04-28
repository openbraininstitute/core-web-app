'use client';

import { useQuery } from '@tanstack/react-query';

import { ActivityStatus } from '@/api/entitycore/types/entities/task-activity';
import { status } from '@/entity-configuration/domain/extraction/extraction-campaign';
import {
  ActivityAggregatedStatus,
  ActivityAggregatedStatusSkeleton,
} from '@/features/task-runner/activity-execution/status';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { WorkspaceContext } from '@/types/common';

type Props = {
  campaignId: string;
  context?: WorkspaceContext;
};

const ACTIVE_STATUSES = [ActivityStatus.PENDING, ActivityStatus.RUNNING];

export function CampaignActivityStatusCell({ campaignId, context }: Props) {
  const workspace = useWorkspace();
  const resolvedContext = context ?? workspace;

  const { data: statusCountMap, isLoading } = useQuery({
    queryKey: ['extraction-campaign-status', resolvedContext, campaignId],
    queryFn: () => status({ id: campaignId, context: resolvedContext }),
    enabled: Boolean(campaignId && resolvedContext.virtualLabId && resolvedContext.projectId),
    refetchInterval: (query) => {
      const values = Array.from(query.state.data?.keys() ?? []);
      return values.some((value) => ACTIVE_STATUSES.includes(value)) ? 20_000 : false;
    },
  });

  if (isLoading || !statusCountMap) {
    return <ActivityAggregatedStatusSkeleton />;
  }

  return <ActivityAggregatedStatus statusCountMap={statusCountMap} />;
}
