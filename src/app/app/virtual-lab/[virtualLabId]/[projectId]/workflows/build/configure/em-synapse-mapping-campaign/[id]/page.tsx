import { notFound } from 'next/navigation';

import { getCellMorphology } from '@/api/entitycore/queries';
import { tryCatch } from '@/api/utils';
import { EmSynapseMappingCampaign } from '@/entity-configuration/domain/model/em-synapse-mapping-campaign';
import { ScanConfiguration } from '@/features/scan-config';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { BuildScanConfigTabs, ScanConfigActivity } from '@/features/scan-config/types';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import type { ExperimentStepKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';

export default async function Page({
  searchParams,
  params: pathParams,
}: ServerSideComponentProp<
  WorkspaceContext & { id: string },
  {
    step: ExperimentStepKeys;
    sessionId: string;
    panel: WorkflowSimulatePanelKeys;
    initialCampaignId: string;
  }
>) {
  const queryParams = await searchParams;
  const { initialCampaignId } = queryParams;
  const { virtualLabId, projectId, id: modelId } = await pathParams;

  const { data: entity, error } = await tryCatch(
    getCellMorphology({ id: modelId, context: { virtualLabId, projectId } })
  );
  if (!entity || error) {
    return notFound();
  }

  let campaignData = null;
  let campaignError = null;

  if (initialCampaignId) {
    const { data, error } = await tryCatch(
      // biome-ignore lint/style/noNonNullAssertion: function is guaranteed to be defined
      EmSynapseMappingCampaign.api.query.resolve!({
        id: initialCampaignId,
        context: { virtualLabId, projectId },
      })
    );

    campaignData = data;
    campaignError = error;

    if (campaignError || !campaignData) {
      return notFound();
    }
  }

  if (!initialCampaignId || (initialCampaignId && campaignData?.config.form)) {
    return (
      <div className="border-neutral-2 ml-2 h-full rounded-2xl border pt-3">
        <ScanConfiguration
          entityId={entity.id}
          entityType={entity.type}
          virtualLabId={virtualLabId}
          projectId={projectId}
          initialConfig={campaignData?.config.form}
          className="px-4 pt-2"
          activity={ScanConfigActivity.Build}
          defaultTab={{
            __activity: ScanConfigActivity.Build,
            id: BuildScanConfigTabs.configuration,
          }}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.Task}
        />
        <DownloadPanel />
      </div>
    );
  }
}
