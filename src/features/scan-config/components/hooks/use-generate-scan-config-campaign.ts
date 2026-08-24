import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isEqual, isString, pick } from 'es-toolkit/compat';

import { generateScanConfigCampaign } from '@/api/one/scan-config';
import { getTargetType } from '@/ui/segments/workflows/config';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  TScanConfigActivity,
  TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

type TUseGenerateScanConfigCampaignParams = {
  ctx: WorkspaceContext;
  activity: TScanConfigActivity;
  entityType: TSupportedEntityTypesForScanConfiguration;
  /**
   * Campaign entity type the workflow produces, taken from its registry entry.
   * Falls back to resolving it from `entityType`, which is ambiguous when
   * several workflows of the same activity share a source type.
   */
  campaignEntityType?: TExtendedEntitiesTypeDict;
  onSuccess?: (campaignId: string) => void;
  onError?: (error: unknown) => void;
};

/**
 * Mutation that generates a scan-config campaign and, on success, refreshes the
 * workspace activities lists that show the new campaign.
 */
export function useGenerateScanConfigCampaign({
  ctx,
  activity,
  entityType,
  campaignEntityType,
  onSuccess,
  onError,
}: TUseGenerateScanConfigCampaignParams) {
  const queryClient = useQueryClient();
  const targetEntityType =
    campaignEntityType ?? getTargetType({ activity, sourceType: entityType });

  return useMutation({
    mutationFn: (variables: { config: unknown; generatedApiUrl: string }) =>
      generateScanConfigCampaign({ ctx, ...variables }),
    onSuccess: (campaignId) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const baseQueryKey = query.queryKey.at(0);
          const filtersQueryKey = query.queryKey.at(1);
          return (
            isString(baseQueryKey) &&
            baseQueryKey.startsWith('workspace/activities') &&
            isEqual(
              pick(filtersQueryKey, ['virtualLabId', 'projectId', 'activity', 'entityType']),
              {
                virtualLabId: ctx.virtualLabId,
                projectId: ctx.projectId,
                activity,
                entityType: targetEntityType,
              }
            )
          );
        },
      });
      onSuccess?.(campaignId);
    },
    onError,
  });
}
