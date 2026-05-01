import { useQuery } from '@tanstack/react-query';

import { estimateTask } from '@/api/one/estimate';

import type { TObiOneTaskType } from '@/api/one/types/task';
import type { WorkspaceContext } from '@/types/common';
import type { CostConfirmationItem, CostConfirmationItemWithCost } from './types';

type UseTaskCostEstimatesParams = {
  items: CostConfirmationItem[];
  taskType: TObiOneTaskType;
  context: WorkspaceContext;
  enabled: boolean;
};

export function useTaskCostEstimates({
  items,
  taskType,
  context,
  enabled,
}: UseTaskCostEstimatesParams) {
  const sortedIds = items
    .map((item) => item.id)
    .sort()
    .join(',');

  return useQuery({
    queryKey: [
      'task-cost-estimates',
      {
        virtualLabId: context.virtualLabId,
        projectId: context.projectId,
        taskType,
        itemIds: sortedIds,
      },
    ],
    queryFn: async ({ signal }) => {
      const results = await Promise.allSettled(
        items.map((item) =>
          estimateTask({
            ctx: context,
            task_type: taskType,
            config_id: item.id,
            signal,
          })
        )
      );

      return items.map((item, index): CostConfirmationItemWithCost => {
        const result = results[index];
        return {
          id: item.id,
          name: item.name,
          cost: result.status === 'fulfilled' ? result.value.cost : null,
        };
      });
    },
    enabled: enabled && items.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
