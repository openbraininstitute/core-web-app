'use client';

import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { use } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveSimulationByCampaignId } from '@/entity-configuration/domain/simulation/ion-channel-model-simulation';
import { ScanConfiguration } from '@/features/scan-config';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity, SchemaMappingKeyDict } from '@/features/scan-config/types';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import type { ExperimentStepKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';

export default function Page({
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
  const queryParams = use(searchParams);
  const { initialCampaignId } = queryParams;
  const { virtualLabId, projectId } = use(pathParams);

  const {
    data: campaignData,
    error,
    isLoading,
  } = useQuery({
    queryKey: keyBuilder.simCampaign({ entityId: initialCampaignId }),
    queryFn: async () => {
      if (!initialCampaignId) return null;
      return await resolveSimulationByCampaignId({
        id: initialCampaignId,
        context: { virtualLabId, projectId },
      });
    },
  });

  if (error) {
    return notFound();
  }

  if (
    !initialCampaignId ||
    (initialCampaignId && !isLoading && campaignData && campaignData.config.form)
  ) {
    return (
      <div className="border-neutral-2 ml-2 h-full rounded-2xl border pt-3">
        <ScanConfiguration
          entityType={ExtendedEntitiesTypeDict.IonChannelModel}
          virtualLabId={virtualLabId}
          projectId={projectId}
          initialConfig={campaignData?.config.form}
          className="px-4 pt-2"
          activity={ScanConfigActivity.Simulate}
          schemaMappingKey={SchemaMappingKeyDict.IonChannelModel}
          campaignOriginAction={ScanConfigCampaignOriginActionDict.Task}
        />
      </div>
    );
  }
}
