import { CircuitExtractionCampaign } from '@/entity-configuration/domain/extraction/extraction-campaign';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ExtractScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { defineScanConfigWorkflow } from '@/features/scan-config/workflow/define';
import { scanConfigEntityQueries } from '@/features/scan-config/workflow/entity-queries';
import { ScanConfigEntitySourceMode } from '@/features/scan-config/workflow/types';

export const extractCircuitWorkflow = defineScanConfigWorkflow({
  id: 'extract-circuit',
  activity: ScanConfigActivity.Extract,
  entity: {
    mode: ScanConfigEntitySourceMode.RouteId,
    query: scanConfigEntityQueries.circuit,
  },
  campaign: {
    resolve: async ({ id, context }) => {
      // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
      return await CircuitExtractionCampaign.api.query.resolve!({ id, context });
    },
  },
  editor: {
    className: 'px-4',
    campaignOriginAction: ScanConfigCampaignOriginActionDict.Task,
    defaultTab: {
      __activity: ScanConfigActivity.Extract,
      id: ExtractScanConfigTabs.configuration,
    },
  },
});
