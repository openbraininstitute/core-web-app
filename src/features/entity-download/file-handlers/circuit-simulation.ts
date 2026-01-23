import { compact } from 'es-toolkit/compat';
import pLimit from 'p-limit';
import pMap from 'p-map';
import pSettle from 'p-settle';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationCampaign } from '@/api/entitycore/queries/simulation/circuit-simulation-campaign';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { getCircuitSimulationResult } from '@/api/entitycore/queries/simulation/circuit-simulation-result';
import { EntityTypeDict } from '@/api/entitycore/types';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import type { ICircuitSimulationExecution } from '@/api/entitycore/types/entities/circuit-simulation-execution';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { ASSET_BASE_PATH, OUTPUT_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import type { FileEntry } from '@/features/entity-download/types';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataSimulationCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

// Concurrency limits tuned for optimal throughput without overwhelming the server
const CONCURRENCY = {
  CAMPAIGNS: 3, // Parallel campaign fetches
  SIMULATIONS: 5, // Parallel simulation processing per campaign
  RESULTS: 10, // Parallel result fetches
  ASSET_DOWNLOADS: 8, // Parallel asset downloads
} as const;

type SimulationData = {
  executions: ICircuitSimulationExecution[];
  results: ICircuitSimulationResult[];
};

type CampaignData = {
  campaign: ICircuitSimulationCampaign;
  simulations: ICircuitSimulation[];
  idx: number;
  dataPath: string;
};

/**
 * Fetches all simulation results for a given simulation concurrently.
 */
async function fetchSimulationResults(
  sim: ICircuitSimulation,
  ctx: WorkspaceContext | undefined,
  resultLimit: ReturnType<typeof pLimit>
): Promise<SimulationData> {
  const executions = await getCircuitSimulationExecutions({
    context: ctx,
    withFacets: false,
    filters: { used__id__in: sim.id },
  });

  const generatedIds = compact(executions.data.flatMap((e) => e.generated?.map((g) => g.id)));

  const results = await pMap(
    generatedIds,
    (id) => resultLimit(() => getCircuitSimulationResult({ id, context: ctx })),
    { concurrency: CONCURRENCY.RESULTS }
  );

  return { executions: executions.data, results };
}

/**
 * Creates asset file entries with concurrent downloads and graceful error handling.
 * Returns only successfully created entries.
 */
async function createAssetFileEntriesBatch(
  assets: Array<{
    entity: ICircuitSimulation | ICircuitSimulationResult | ICircuitSimulationCampaign;
    asset: { id: string; path: string; label?: string };
    path: string;
  }>,
  ctx: WorkspaceContext | undefined,
  downloadLimit: ReturnType<typeof pLimit>
): Promise<FileEntry[]> {
  const settled = await pSettle(
    assets.map(({ entity, asset, path }) =>
      downloadLimit(() => createAssetFileEntry({ entity, asset, path, ctx }))
    )
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<FileEntry> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Processes a single simulation: fetches results and prepares asset entries.
 */
async function processSimulation(
  sim: ICircuitSimulation,
  dataPath: string,
  ctx: WorkspaceContext | undefined,
  resultLimit: ReturnType<typeof pLimit>
): Promise<{
  simData: SimulationData;
  assetEntries: Array<{
    entity: ICircuitSimulation | ICircuitSimulationResult;
    asset: { id: string; path: string };
    path: string;
  }>;
}> {
  const simPath = `${dataPath}/${sim.name}`;
  const simData = await fetchSimulationResults(sim, ctx, resultLimit);

  // Collect all asset entries for batch download
  const assetEntries: Array<{
    entity: ICircuitSimulation | ICircuitSimulationResult;
    asset: { id: string; path: string };
    path: string;
  }> = [];

  // Simulation assets
  for (const asset of sim.assets) {
    assetEntries.push({
      entity: sim,
      asset,
      path: `${simPath}/${asset.path}`,
    });
  }

  // Result assets
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
 * Fetches campaign data including simulations concurrently.
 */
async function fetchCampaignData(
  entityId: string,
  idx: number,
  ctx: WorkspaceContext | undefined
): Promise<CampaignData | null> {
  const campaign = await getCircuitSimulationCampaign({
    id: entityId,
    context: ctx,
  });

  const configAsset = campaign.assets.find((asset) => asset.label === 'campaign_generation_config');
  if (!configAsset) return null;

  const simulations = await getCircuitSimulations({
    context: ctx,
    filters: { simulation_campaign_id: campaign.id },
  });

  return {
    campaign,
    simulations: simulations.data,
    idx,
    dataPath: `${ASSET_BASE_PATH}/${idx}`,
  };
}

export async function* getCircuitSimulationFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<Record<string, unknown>>();

  // Yield README template first
  try {
    yield await createTemplateFileEntry(EntityTypeDict.SingleNeuronSimulation);
  } catch {
    // Template creation is non-critical
  }

  // Create shared limiters for resource management
  const resultLimit = pLimit(CONCURRENCY.RESULTS);
  const downloadLimit = pLimit(CONCURRENCY.ASSET_DOWNLOADS);

  // Fetch all campaigns concurrently
  const campaignResults = await pSettle(
    entityIds.map((id, idx) => fetchCampaignData(id, idx, ctx)),
    { concurrency: CONCURRENCY.CAMPAIGNS }
  );

  const campaigns = campaignResults
    .filter((r): r is PromiseFulfilledResult<CampaignData | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((c): c is CampaignData => c !== null);

  // Process each campaign
  for (const { campaign, simulations, idx, dataPath } of campaigns) {
    const idxExtra = { idx, data_path: dataPath };

    // Yield campaign config asset
    const configAsset = campaign.assets.find(
      (asset) => asset.label === 'campaign_generation_config'
    );
    if (configAsset) {
      const configEntries = await createAssetFileEntriesBatch(
        [
          {
            entity: campaign,
            asset: configAsset,
            path: `${dataPath}/${configAsset.path}`,
          },
        ],
        ctx,
        downloadLimit
      );
      for (const entry of configEntries) {
        yield entry;
      }
    }

    // Process all simulations concurrently
    const simulationResults = await pMap(
      simulations,
      (sim) => processSimulation(sim, dataPath, ctx, resultLimit),
      { concurrency: CONCURRENCY.SIMULATIONS }
    );

    // Build simulation full object and collect all asset entries
    const simulationFullObject: Record<string, SimulationData> = {};
    const allAssetEntries: Array<{
      entity: ICircuitSimulation | ICircuitSimulationResult;
      asset: { id: string; path: string };
      path: string;
    }> = [];

    for (let i = 0; i < simulations.length; i++) {
      const sim = simulations[i];
      const { simData, assetEntries } = simulationResults[i];
      simulationFullObject[sim.name] = simData;
      allAssetEntries.push(...assetEntries);
    }

    // Download all assets concurrently and yield as they complete
    const fileEntries = await createAssetFileEntriesBatch(allAssetEntries, ctx, downloadLimit);
    for (const entry of fileEntries) {
      yield entry;
    }

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
