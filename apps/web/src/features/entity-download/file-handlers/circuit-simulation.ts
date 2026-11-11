import { compact } from 'es-toolkit/compat';
import pLimit from 'p-limit';
import pMap from 'p-map';

import { getSimulationCampaign } from '@/api/entitycore/queries/simulation/campaign';
import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { getSimulationExecutions } from '@/api/entitycore/queries/simulation/campaign/simulation-execution';
import { getSimulationResult } from '@/api/entitycore/queries/simulation/campaign/simulation-result';
import { AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import { ASSET_BASE_PATH, OUTPUT_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import { getMetadataSimulationCsvEntryBase, tryAssetEntry } from '@/features/entity-download/utils';
import { fetchAllPaginatedData } from '@/utils/pagination';

import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/simulation-campaign';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { FileEntry } from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';

const CONCURRENCY = {
  CAMPAIGNS: 3,
  SIMULATIONS: 5,
  RESULTS: 10,
} as const;

const PAGE_SIZE = 100;

type SimulationData = {
  executions: IExecutionActivity[];
  results: ISimulationResult[];
};

type CampaignData = {
  campaign: ICircuitSimulationCampaign;
  simulations: ISimulation[];
  idx: number;
  dataPath: string;
};

type AssetEntry = {
  entity: ISimulation | ISimulationResult | ICircuitSimulationCampaign;
  asset: IAsset;
  path: string;
};

/** Reads every page of a list (entitycore returns 30 items by default), stopping on cancel. */
function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<{ data: T[] }>,
  signal?: AbortSignal
): Promise<T[]> {
  return fetchAllPaginatedData({
    fn: async (page, pageSize) => (signal?.aborted ? { data: [] } : fetchPage(page, pageSize)),
    pageSize: PAGE_SIZE,
  });
}

/**
 * fetches all simulation results for a given simulation concurrently.
 */
async function fetchSimulationResults(
  sim: ISimulation,
  ctx: WorkspaceContext | undefined,
  resultLimit: ReturnType<typeof pLimit>,
  signal?: AbortSignal
): Promise<SimulationData> {
  const executions = await fetchAllPages(
    (page, pageSize) =>
      getSimulationExecutions({
        context: ctx,
        withFacets: false,
        filters: { used__id__in: sim.id, page, page_size: pageSize },
      }),
    signal
  );

  const generatedIds = compact(executions.flatMap((e) => e.generated?.map((g) => g.id)));

  const results = await pMap(
    generatedIds,
    (id) => resultLimit(() => getSimulationResult({ id, context: ctx })),
    { concurrency: CONCURRENCY.RESULTS }
  );

  return { executions, results };
}

/**
 * processes a single simulation: fetches results and prepares asset entries.
 */
async function processSimulation(
  sim: ISimulation,
  dataPath: string,
  ctx: WorkspaceContext | undefined,
  resultLimit: ReturnType<typeof pLimit>,
  signal?: AbortSignal
): Promise<{
  simData: SimulationData;
  assetEntries: AssetEntry[];
}> {
  const simPath = `${dataPath}/${sim.name}`;
  const simData = await fetchSimulationResults(sim, ctx, resultLimit, signal);

  const assetEntries: AssetEntry[] = [];

  // simulation assets
  for (const asset of sim.assets) {
    assetEntries.push({
      entity: sim,
      asset,
      path: `${simPath}/${asset.path}`,
    });
  }

  // result assets
  const resultsPath = `${simPath}/${OUTPUT_BASE_PATH}`;
  for (const result of simData.results) {
    for (const asset of result.assets) {
      assetEntries.push({
        entity: result,
        asset,
        path: `${resultsPath}/${asset.path}`,
      });
    }
  }

  return { simData, assetEntries };
}

/**
 * fetches campaign data including simulations concurrently.
 */
async function fetchCampaignData(
  entityId: string,
  idx: number,
  ctx: WorkspaceContext | undefined,
  signal?: AbortSignal
): Promise<CampaignData | null> {
  const campaign = await getSimulationCampaign({
    id: entityId,
    context: ctx,
  });

  const configAsset = campaign.assets.find((asset) => asset.label === 'campaign_generation_config');
  if (!configAsset) return null;

  const simulations = await fetchAllPages(
    (page, pageSize) =>
      getSimulations({
        context: ctx,
        filters: { simulation_campaign_id: campaign.id, page, page_size: pageSize },
      }),
    signal
  );

  return {
    campaign,
    simulations,
    idx,
    dataPath: `${ASSET_BASE_PATH}/${idx}`,
  };
}

export async function* getCircuitSimulationFiles(
  entityIds: string[],
  ctx?: WorkspaceContext,
  signal?: AbortSignal,
  failed: string[] = []
) {
  const metadata = new Metadata<Record<string, unknown>>();

  /**
   * Opens one asset at a time, right before the archive writes it, so no S3 body ever sits idle.
   */
  async function* streamAssetEntries(assets: AssetEntry[]): AsyncGenerator<FileEntry> {
    for (const { entity, asset, path } of assets) {
      if (signal?.aborted) return;
      yield* tryAssetEntry({ entity, asset, path, ctx, signal }, failed);
    }
  }

  // TODO: add readme file when provided
  /* try {
    yield await createTemplateFileEntry(EntityTypeDict.CircuitSimulation);
  } catch {
    // Template creation is non-critical
  } */

  // build shared limiters for resource management
  const resultLimit = pLimit(CONCURRENCY.RESULTS);
  const campaignLimit = pLimit(CONCURRENCY.CAMPAIGNS);

  // fetch all campaigns concurrently with limit
  const campaignPromises = entityIds.map((id, idx) =>
    campaignLimit(() => fetchCampaignData(id, idx, ctx, signal))
  );
  const campaignResults = await Promise.allSettled(campaignPromises);

  const campaigns: CampaignData[] = [];
  for (const [idx, result] of campaignResults.entries()) {
    if (result.status === 'fulfilled') {
      if (result.value) campaigns.push(result.value);
    } else if (!signal?.aborted) {
      // its folder and metadata row are missing, so list it with the files that failed
      failed.push(`${ASSET_BASE_PATH}/${idx} (simulation campaign ${entityIds[idx]})`);
    }
  }

  // process campaigns
  for (const { campaign, simulations, idx, dataPath } of campaigns) {
    if (signal?.aborted) return;
    const idxExtra = { idx, data_path: dataPath };

    const configAsset = campaign.assets.find(
      (asset) => asset.label === AssetLabel.campaign_generation_config
    );
    if (configAsset) {
      yield* streamAssetEntries([
        { entity: campaign, asset: configAsset, path: `${dataPath}/${configAsset.path}` },
      ]);
    }

    // fetch every simulation's results concurrently; only metadata, no asset bodies
    const simulationResults = await pMap(
      simulations,
      (sim) => processSimulation(sim, dataPath, ctx, resultLimit, signal),
      { concurrency: CONCURRENCY.SIMULATIONS }
    );

    // build simulation full object and collect all asset entries
    const simulationFullObject: Record<string, SimulationData> = {};
    const allAssetEntries: AssetEntry[] = [];

    for (let i = 0; i < simulations.length; i++) {
      const sim = simulations[i];
      const { simData, assetEntries } = simulationResults[i];
      simulationFullObject[sim.name] = simData;
      allAssetEntries.push(...assetEntries);
    }

    yield* streamAssetEntries(allAssetEntries);

    metadata.add({
      csv: { ...idxExtra, ...getMetadataSimulationCsvEntryBase(campaign) },
      json: {
        ...idxExtra,
        ...campaign,
        simulations: simulationFullObject,
      },
    });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
