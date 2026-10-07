import { RiErrorWarningFill } from '@remixicon/react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { compact } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getIonChannelModelingCampaigns } from '@/api/entitycore/queries/model/ion-channel-modeling-campaign';
import { getIonChannelModelingConfigs } from '@/api/entitycore/queries/model/ion-channel-modeling-config';
import { getIonChannelModelingExecutions } from '@/api/entitycore/queries/model/ion-channel-modeling-execution';
import { getTaskConfig } from '@/api/entitycore/queries/task';
import { TaskActivityType } from '@/api/entitycore/types/entities/task-activity';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { type TViewVariant, ViewVariant, WorkspaceScope } from '@/constants';
import { usedTaskConfigId } from '@/entity-configuration/domain/experimental/efeature-extraction-result';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { detailViewGridContainerClass } from '@/ui/segments/detail-view/variant-styles';

import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IIonChannelModelingCampaign } from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { IIonChannelModelingConfig } from '@/api/entitycore/types/entities/ion-channel-modeling-config';
import type { TFromIdRef } from '@/features/scan-config/helpers';
import type { WorkspaceContext } from '@/types/common';

/** a legacy campaign's `campaign_generation_config` asset; `recordings` was a scan dimension */
type TLegacyCampaignGenerationConfig = {
  form: { initialize: { recordings: TFromIdRef | TFromIdRef[] } };
};

async function fittedRecordingIds(modelId: string, context: WorkspaceContext) {
  const configId = await usedTaskConfigId(
    modelId,
    TaskActivityType.IonChannelModelingExecution,
    context
  );
  if (!configId) return [];
  const config = await getTaskConfig({ id: configId, context });
  return config.inputs.map((input) => input.id);
}

/** models fitted before the scan-config editor: execution → config → campaign → saved form */
async function legacyFittedRecordingIds(modelId: string, context: WorkspaceContext) {
  const executions = await getIonChannelModelingExecutions({
    context,
    filters: { generated__id__in: [modelId] },
    withFacets: false,
  });
  const configIds = executions.data.flatMap((execution: IExecutionActivity) =>
    execution.used.map((usedEntity) => usedEntity.id)
  );
  if (!configIds.length) return [];

  const configurations = await getIonChannelModelingConfigs({
    context,
    filters: { id__in: configIds },
    withFacets: false,
  });
  const campaignIds = configurations.data.map(
    (configuration: IIonChannelModelingConfig) => configuration.ion_channel_modeling_campaign_id
  );
  if (!campaignIds.length) return [];

  const campaigns = await getIonChannelModelingCampaigns({
    context,
    filters: { id__in: campaignIds },
    withFacets: false,
  });
  const forms = await Promise.all(
    compact(
      campaigns.data.map((campaign: IIonChannelModelingCampaign) => {
        const cfgAsset = campaign.assets.find(
          (asset) => asset.label === AssetLabel.campaign_generation_config
        );
        return cfgAsset
          ? downloadAsset({
              ctx: context,
              entityType: campaign.type,
              entityId: campaign.id,
              id: cfgAsset.id,
              asRawResponse: true,
            }).then((response) => response.json() as Promise<TLegacyCampaignGenerationConfig>)
          : null;
      })
    )
  );

  return forms.flatMap(({ form }) => [form.initialize.recordings].flat().map((r) => r.id_str));
}

export function IonChannelRecordingRelatedArtifacts({
  icm,
  context,
  variant = ViewVariant.Light,
}: {
  icm: IonChannelModel;
  context: WorkspaceContext;
  variant?: TViewVariant;
}) {
  const { data, error } = useSuspenseQuery({
    queryKey: ['ion-channel-recording-related-artifacts', { id: icm.id, context }],
    queryFn: async () => {
      const recordingIds = await fittedRecordingIds(icm.id, context);
      return recordingIds.length ? recordingIds : await legacyFittedRecordingIds(icm.id, context);
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  if (error) {
    return (
      <div>
        <Empty image={<RiErrorWarningFill />} description={error.message} />
      </div>
    );
  }

  if (!data.length) {
    return <Empty description="No recordings found for this model" />;
  }

  return (
    <BrowseEntityScope
      dataType={ExtendedEntitiesTypeDict.IonChannelRecording}
      extraQueryParams={{ id__in: data }}
      scope={WorkspaceScope.Combined}
      detailVariant={variant}
      contentOnInsetPanel={variant === ViewVariant.Default}
      classNames={{
        container: detailViewGridContainerClass(variant),
      }}
      allowFilter={false}
      allowSearch={false}
      requireMiniDetailView={false}
      requireBrainRegion={false}
    />
  );
}
