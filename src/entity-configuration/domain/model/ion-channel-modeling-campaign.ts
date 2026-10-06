import { flatMap, get, sortBy } from 'es-toolkit/compat';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import {
  getIonChannelModelingCampaign,
  getIonChannelModelingCampaigns,
} from '@/api/entitycore/queries/model/ion-channel-modeling-campaign';
import { getIonChannelModelingConfigs } from '@/api/entitycore/queries/model/ion-channel-modeling-config';
import { getIonChannelModelingExecutions } from '@/api/entitycore/queries/model/ion-channel-modeling-execution';
import { discardBrainRegionQueryParams } from '@/api/entitycore/transformers';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type {
  IIonChannelModelingCampaign,
  IonChannelModelingCampaignFilter,
} from '@/api/entitycore/types/entities/ion-channel-modeling-campaign';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { Config } from '@/features/scan-config/types';
import type { AwaitedType, WorkspaceContext } from '@/types/common';

async function resolveIonChannelModelingCampaigns({
  withFacets,
  context,
  filters,
}: {
  withFacets?: boolean;
  context: WorkspaceContext | undefined;
  filters?: Partial<IonChannelModelingCampaignFilter>;
}) {
  filters = discardBrainRegionQueryParams(filters);

  const source = await getIonChannelModelingCampaigns({
    context,
    withFacets,
    filters,
  });

  const campaignIDs = source.data.map((o) => o.id);

  // fetch all configs belonging to these campaigns
  const configs =
    campaignIDs.length > 0
      ? await getIonChannelModelingConfigs({
          context,
          withFacets: false,
          filters: { ion_channel_modeling_campaign_id__in: campaignIDs },
        })
      : { data: [] };

  const configsByCampaignId = configs.data.reduce<Record<string, (typeof configs.data)[number][]>>(
    (acc, config) => {
      const cid = config.ion_channel_modeling_campaign_id;
      if (!acc[cid]) acc[cid] = [];
      acc[cid].push(config);
      return acc;
    },
    {}
  );

  // fetch all executions linked to those configs
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getIonChannelModelingExecutions({
          context,
          withFacets: false,
          filters: { used__id__in: configIDs },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getIonChannelModelingExecutions>>['data'],
        };

  // map configId → executions that used it
  const executions = executionsResponse.data;
  const executionsByConfigId = executions.reduce<Record<string, typeof executions>>((acc, exec) => {
    for (const u of exec.used) {
      if (!acc[u.id]) acc[u.id] = [];
      acc[u.id].push(exec);
    }
    return acc;
  }, {});

  // enrich each campaign with configs → executions
  const enrichedData = source.data.map((campaign) => {
    const campaignConfigs = configsByCampaignId[campaign.id] ?? [];
    const enrichedConfigs = campaignConfigs.map((config) => ({
      ...config,
      executions: executionsByConfigId[config.id] ?? [],
    }));
    return { ...campaign, configs: enrichedConfigs };
  });

  return {
    data: enrichedData,
    pagination: source.pagination,
    facets: source.facets,
  };
}

export async function resolveIonChannelModelingByCampaignId({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const campaign = await getIonChannelModelingCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No ion channel modeling campaign with id ${id} found`);
  }

  // campaign → configs
  const configs = await getIonChannelModelingConfigs({
    context,
    withFacets: false,
    filters: { ion_channel_modeling_campaign_id: id },
  });

  // configs → executions
  const configIDs = configs.data.map((c) => c.id);
  const executionsResponse =
    configIDs.length > 0
      ? await getIonChannelModelingExecutions({
          context,
          withFacets: false,
          filters: { used__id__in: configIDs },
        })
      : {
          data: [] as Awaited<ReturnType<typeof getIonChannelModelingExecutions>>['data'],
        };

  // extract generated ion channel model IDs from executions
  const generatedModelIds = flatMap(
    executionsResponse.data,
    (exec) => exec.generated?.map((g) => g.id) ?? []
  );

  return {
    campaign,
    configs: configs.data,
    generatedModelIds,
  };
}

export type TExtendedIonChannelModelingCampaignsType = AwaitedType<
  ReturnType<typeof resolveIonChannelModelingCampaigns>
>;

export async function resolveIonChannelModelingCampaignConfig({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}) {
  const campaign = await getIonChannelModelingCampaign({ id, context });

  if (!campaign) {
    throw new Error(`No ion channel modeling campaign with id ${id} found`);
  }

  const assets = campaign.assets ?? [];
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.campaign_generation_config,
  });

  if (!configAsset) {
    return { campaign, config: null };
  }

  const rawConfig = await downloadAsset({
    entityId: campaign.id,
    entityType: EntityTypeDict.IonChannelModelingCampaign,
    id: configAsset.id,
    ctx: context,
    asRawResponse: true,
  });
  const config = await rawConfig.json();

  return { campaign, config };
}

const LegacyEquationKeys: Record<string, string> = {
  SigFitMInf: 'sig_fit_minf',
  SigFitMTau: 'sig_fit_mtau',
  ThermoFitMTau: 'thermo_fit_mtau',
  ThermoFitMTauV2: 'thermo_fit_mtau_v2',
  BellFitMTau: 'bell_fit_mtau',
  SigFitHInf: 'sig_fit_hinf',
  SigFitHTau: 'sig_fit_htau',
};

type TLegacyEquationBlock = { type?: string };

type TIonChannelFittingFormInput = {
  type?: string;
  info?: unknown;
  initialize?: Record<string, unknown> & { recordings?: unknown };
  minf_eq?: TLegacyEquationBlock;
  mtau_eq?: TLegacyEquationBlock;
  hinf_eq?: TLegacyEquationBlock;
  htau_eq?: TLegacyEquationBlock;
  gate_exponents?: { m_power?: number; h_power?: number };
  model_type?: unknown;
};

/**
 * reshapes a config saved by the pre-scan-config builder (one recording, an equation block per
 * gating variable, a gate exponents block) into obi-one's current `IonChannelFittingScanConfig`,
 * so the scan-config editor can show it read-only
 */
export function toIonChannelFittingForm(form: TIonChannelFittingFormInput): Config {
  if (form.model_type) return form as Config;

  const equationKey = (block?: TLegacyEquationBlock) =>
    block?.type ? (LegacyEquationKeys[block.type] ?? block.type) : undefined;
  const { recordings, ...initialize } = form.initialize ?? {};

  return {
    type: form.type,
    info: form.info,
    initialize: { ...initialize, recordings: [recordings].flat().filter(Boolean) },
    model_type: {
      type: 'HodgkinHuxleyIonChannelModel',
      minf_eq: equationKey(form.minf_eq),
      mtau_eq: equationKey(form.mtau_eq),
      hinf_eq: equationKey(form.hinf_eq),
      htau_eq: equationKey(form.htau_eq),
      m_power: form.gate_exponents?.m_power,
      h_power: form.gate_exponents?.h_power,
    },
  } as Config;
}

type TResolvedIonChannelModelingByCampaign = Awaited<
  ReturnType<typeof resolveIonChannelModelingByCampaignId>
>;
type TResolvedIonChannelModelingByCampaigns = Awaited<
  ReturnType<typeof resolveIonChannelModelingCampaigns>
>;

type TEnrichedIonChannelModelingCampaign = TExtendedIonChannelModelingCampaignsType['data'][number];
type TEnrichedIonChannelModelingConfig = TEnrichedIonChannelModelingCampaign['configs'][number];

function getIonChannelModelingConfigStatus(config: TEnrichedIonChannelModelingConfig) {
  const executions = get(config, 'executions', []) as Array<{
    status?: string;
    creation_date?: string;
  }>;
  const sorted = sortBy(executions, (e) => e.creation_date);
  return (sorted.at(-1)?.status as ActivityStatus) ?? ActivityStatus.CREATED;
}

export function getStatusCountMap(campaign: TEnrichedIonChannelModelingCampaign) {
  const allConfigs = campaign.configs ?? [];

  return allConfigs.reduce((map, config) => {
    const status = getIonChannelModelingConfigStatus(config);
    return map.set(status, (map.get(status) ?? 0) + 1);
  }, new Map<ActivityStatus, number>());
}

export const IonChannelModelingCampaign: EntityCoreTypeConfig<
  IIonChannelModelingCampaign,
  TResolvedIonChannelModelingByCampaign,
  TResolvedIonChannelModelingByCampaigns
> = {
  group: EntityTypeGroup.Models,
  title: 'Ion channel modeling campaign',
  extendedType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
  type: EntityTypeDict.IonChannelModelingCampaign,
  slug: EntitySlug.IonChannelModelingCampaign,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: resolveIonChannelModelingCampaigns,
      one: getIonChannelModelingCampaign,
      resolve: resolveIonChannelModelingByCampaignId,
    },
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview],
  isBookmarkable: false,
  isDownloadable: false,
  isCopyable: false,
  isSimulatable: false,
} as const;
