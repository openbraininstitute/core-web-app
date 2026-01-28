'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { use } from 'react';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import ScanConfig from '@/features/scan-config';
import { ScanConfigActivity } from '@/features/scan-config/types';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { WorkflowSimulatePanelKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import type { ExperimentStepKeys } from '@/ui/segments/workflows/simulate/single-neuron/shared/elements/menu';
import { keyBuilder } from '@/ui/use-query-keys/data';

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
  // const { initialCampaignId } = queryParams;
  const { virtualLabId, projectId, id: modelId } = use(pathParams);

  let sessionId = queryParams?.sessionId;
  if (!sessionId) sessionId = crypto.randomUUID();

  const { data: entity, error } = useSuspenseQuery({
    queryKey: keyBuilder.oneCircuit({ virtualLabId, projectId, entityId: modelId }),
    queryFn: () => getCircuit({ id: modelId, context: { virtualLabId, projectId } }),
  });

  // const {
  //   data: campaignData,
  //   error,
  //   isLoading,
  // } = useQuery({
  //   queryKey: keyBuilder.simCampaign({ entityId: initialCampaignId }),
  //   queryFn: async () => {
  //     if (!initialCampaignId) return null;
  //     return await resolveSimulationByCampaignId({
  //       id: initialCampaignId,
  //       context: { virtualLabId, projectId },
  //     });
  //   },
  // });

  if (error || !entity) {
    return notFound();
  }

  return (
    <div className="border-neutral-2 ml-2 h-full rounded-2xl border pt-3">
      <ScanConfig
        modelId={entity.id}
        virtualLabId={virtualLabId}
        projectId={projectId}
        initialConfig={undefined}
        className="px-10 pt-2"
        activity={ScanConfigActivity.Extract}
      />
    </div>
  );
  // if (
  //   !initialCampaignId ||
  //   (initialCampaignId && !isLoading && campaignData && campaignData.config.form)
  // ) {
  // }
}
