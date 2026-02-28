'use client';

import { useQuery } from '@tanstack/react-query';
import { use, useMemo } from 'react';

import { resolveIonChannelModelingCampaignConfig } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { IonChannelModelBuilding } from '@/ui/segments/workflows/build/ion-channel-build';
import { ORIGINAL_CAMPAIGN_ID_QUERY } from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ServerSideComponentProp } from '@/types/common';

export default function Page({
  searchParams,
}: ServerSideComponentProp<null, { sessionId: string; [key: string]: string }>) {
  const queryParams = use(searchParams);
  const originalCampaignId = queryParams[ORIGINAL_CAMPAIGN_ID_QUERY];
  const readonly = queryParams.readonly === 'true';
  const { virtualLabId, projectId } = useWorkspace();

  const sessionId = useMemo(
    () => queryParams.sessionId || crypto.randomUUID(),
    [queryParams.sessionId]
  );

  const { data: campaignData, isLoading } = useQuery({
    queryKey: keyBuilder.singleIonChannelModelingCampaign({
      context: { virtualLabId, projectId },
      id: originalCampaignId,
      resolve: 'config',
    }),
    queryFn: async () => {
      if (!originalCampaignId) return null;
      return await resolveIonChannelModelingCampaignConfig({
        id: originalCampaignId,
        context: { virtualLabId, projectId },
      });
    },
    enabled: !!originalCampaignId,
  });

  if (originalCampaignId && isLoading) return null;

  const initialConfig = campaignData?.config?.form ?? campaignData?.config ?? null;

  return (
    <IonChannelModelBuilding
      sessionId={sessionId}
      initialConfig={initialConfig}
      readonly={readonly}
    />
  );
}
