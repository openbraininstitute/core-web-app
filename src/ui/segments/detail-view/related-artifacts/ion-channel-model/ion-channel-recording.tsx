import { RiErrorWarningFill } from '@remixicon/react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Empty } from 'antd';
import { compact } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getIonChannelModelingCampaigns } from '@/api/entitycore/queries/model/ion-channel-modeling-campaign';
import { getIonChannelModelingConfigs } from '@/api/entitycore/queries/model/ion-channel-modeling-config';
import { getIonChannelModelingExecutions } from '@/api/entitycore/queries/model/ion-channel-modeling-execution';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { tryCatch } from '@/api/utils';
import { WorkspaceScope } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import {
  detailViewInsetPanelClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';

import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IIonChannelModelingCampaign } from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { IIonChannelModelingConfig } from '@/api/entitycore/types/entities/ion-channel-modeling-config';
import type { IonChannelFittingGridScanGenerationTask } from '@/api/one/types/ion-channel-fitting-scan-task';
import type { WorkspaceContext } from '@/types/common';

const browseScopeProps = {
  allowQuery: false,
  allowFilter: false,
  allowSearch: false,
  requireMiniDetailView: false,
  requireBrainRegion: false,
} as const;

export function IonChannelRecordingRelatedArtifacts({
  icm,
  context,
  variant = 'light',
}: {
  icm: IonChannelModel;
  context: WorkspaceContext;
  variant?: DetailViewVariant;
}) {
  const { data, error } = useSuspenseQuery({
    queryKey: ['ion-channel-recording-related-artifacts', { id: icm.id, context }],
    queryFn: async () => {
      const { data: executions, error } = await tryCatch(
        getIonChannelModelingExecutions({
          context,
          filters: { generated__id__in: [icm.id] },
          withFacets: false,
        })
      );
      const exsIds = executions?.data.flatMap((execution: IExecutionActivity) =>
        execution.used.map((usedEntity) => usedEntity.id)
      );
      if (error) {
        throw error;
      }

      if (!executions || !exsIds?.length) {
        return [];
      }

      const { data: configurations, error: configurationError } = await tryCatch(
        getIonChannelModelingConfigs({
          context,
          filters: { id__in: exsIds },
          withFacets: false,
        })
      );

      const campaignIds = configurations?.data.map(
        (configuration: IIonChannelModelingConfig) => configuration.ion_channel_modeling_campaign_id
      );

      if (configurationError) {
        throw configurationError;
      }

      if (!configurations || !campaignIds?.length) {
        return [];
      }

      const { data: campaigns, error: campaignError } = await tryCatch(
        getIonChannelModelingCampaigns({
          context,
          filters: { id__in: campaignIds },
          withFacets: false,
        })
      );

      if (campaignError) {
        throw campaignError;
      }

      if (!campaigns || !campaigns.data.length) {
        return [];
      }
      const { data: campaignConfigs, error: campaignConfigError } = await tryCatch(
        Promise.all(
          compact(
            campaigns?.data.map((campaign: IIonChannelModelingCampaign) => {
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
                  })
                : null;
            })
          )
        )
      );

      if (campaignConfigError) {
        throw campaignConfigError;
      }

      if (!campaignConfigs || !campaignConfigs.length) {
        return [];
      }

      const parsed = (await Promise.all(
        campaignConfigs.map(async (response) => await response.json())
      )) as Array<IonChannelFittingGridScanGenerationTask>;

      return parsed.map((o) => o.form.initialize.recordings.id_str);
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
    return (
      <BrowseEntityScope
        dataType={ExtendedEntitiesTypeDict.IonChannelRecording}
        detailVariant={variant}
        contentOnInsetPanel={variant === 'onPrimary'}
        classNames={{
          container: cn(
            'max-h-none!',
            variant === 'onPrimary' && detailViewInsetPanelClass(variant)
          ),
        }}
        {...browseScopeProps}
      />
    );
  }

  return (
    <BrowseEntityScope
      dataType={ExtendedEntitiesTypeDict.IonChannelRecording}
      extraQueryParams={{ id__in: data }}
      scope={WorkspaceScope.Combined}
      detailVariant={variant}
      contentOnInsetPanel={variant === 'onPrimary'}
      classNames={{
        container: cn(
          'max-h-none!',
          variant === 'onPrimary' && detailViewInsetPanelClass(variant)
        ),
      }}
      {...browseScopeProps}
    />
  );
}
