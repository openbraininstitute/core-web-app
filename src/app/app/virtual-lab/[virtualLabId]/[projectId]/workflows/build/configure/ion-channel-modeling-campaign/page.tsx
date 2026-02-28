import { tryCatch } from '@/api/utils';
import { resolveIonChannelModelingCampaignConfig } from '@/entity-configuration/domain/model/ion-channel-modeling-campaign';
import { getQueryClient } from '@/query-provider/server';
import { IonChannelModelBuilding } from '@/ui/segments/workflows/build/ion-channel-build';
import { ORIGINAL_CAMPAIGN_ID_QUERY } from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({
  searchParams,
  params,
}: ServerSideComponentProp<
  { virtualLabId: string; projectId: string },
  { sessionId: string; readonly: string; [key: string]: string }
>) {
  const [{ virtualLabId, projectId }, queryParams] = await Promise.all([params, searchParams]);
  const originalCampaignId = queryParams[ORIGINAL_CAMPAIGN_ID_QUERY];
  const readonly = queryParams.readonly === 'true';
  const sessionId = queryParams.sessionId || crypto.randomUUID();

  let initialConfig: Record<string, any> | null = null;
  if (originalCampaignId) {
    const queryClient = getQueryClient();
    const { data: campaignData, error } = await tryCatch(
      queryClient.fetchQuery({
        queryKey: keyBuilder.singleIonChannelModelingCampaign({
          context: { virtualLabId, projectId },
          id: originalCampaignId,
          resolve: 'config',
        }),
        queryFn: () =>
          resolveIonChannelModelingCampaignConfig({
            id: originalCampaignId,
            context: { virtualLabId, projectId },
          }),
      })
    );
    if (!campaignData || error) {
      throw new Error(`Failed to fetch campaign data: ${error?.message || 'Unknown error'}`);
    }
    initialConfig = campaignData?.config?.form ?? campaignData?.config ?? null;
  }

  return (
    <IonChannelModelBuilding
      sessionId={sessionId}
      initialConfig={initialConfig}
      readonly={readonly}
    />
  );
}
