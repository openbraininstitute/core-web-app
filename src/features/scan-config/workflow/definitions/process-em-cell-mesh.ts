import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { scanConfigEntityQueries } from '@/features/scan-config/workflow/entity-queries';

export const processEmCellMeshWorkflow = defineScanConfigWorkflow({
  id: 'process-em-cell-mesh',
  activity: ScanConfigActivity.Process,
  entity: {
    mode: 'route-id',
    query: scanConfigEntityQueries.emCellMesh,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
      return await SkeletonizationCampaign.api.query.resolve!({ id, context });
    },
  },
  editor: {
    className: 'px-4',
  },
});
