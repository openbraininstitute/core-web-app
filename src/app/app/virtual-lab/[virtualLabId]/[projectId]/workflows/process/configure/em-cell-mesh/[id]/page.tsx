'use client';

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { use } from 'react';

import { getEmCellMesh } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { SkeletonizationCampaign } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import { ScanConfiguration } from '@/features/scan-config';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';
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
  const { virtualLabId, projectId, id: modelId } = use(pathParams);

  const { data: entity } = useSuspenseQuery({
    queryKey: keyBuilder.entity({
      context: { virtualLabId, projectId },
      id: modelId,
      type: EntityTypeDict.EMCellMesh,
    }),
    queryFn: () => getEmCellMesh({ id: modelId, context: { virtualLabId, projectId } }),
  });

  const {
    data: campaignData,
    error,
    isLoading,
  } = useQuery({
    queryKey: keyBuilder.simCampaign({ entityId: initialCampaignId }),
    queryFn: async () => {
      if (!initialCampaignId) return null;
      const resolveSkeletonizationCampaign = SkeletonizationCampaign.api.query.resolve;
      if (!resolveSkeletonizationCampaign) return null;
      return await resolveSkeletonizationCampaign({
        id: initialCampaignId,
        context: { virtualLabId, projectId },
      });
    },
  });

  if (error || !entity) {
    return notFound();
  }

  if (!initialCampaignId || (initialCampaignId && !isLoading && campaignData?.config.form)) {
    return (
      <div className="border-neutral-2 ml-2 h-full rounded-2xl border">
        <ScanConfiguration
          entityId={entity.id}
          entityType={entity.type}
          virtualLabId={virtualLabId}
          projectId={projectId}
          initialConfig={campaignData?.config.form}
          className="px-4"
          activity={ScanConfigActivity.Process}
        />
        <DownloadPanel />
      </div>
    );
  }
}
