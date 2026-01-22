import { compact } from 'es-toolkit/compat';
import pMap from 'p-map';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationCampaign } from '@/api/entitycore/queries/simulation/circuit-simulation-campaign';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { getCircuitSimulationResult } from '@/api/entitycore/queries/simulation/circuit-simulation-result';
import { EntityTypeDict } from '@/api/entitycore/types';
import type { ICircuitSimulationExecution } from '@/api/entitycore/types/entities/circuit-simulation-execution';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { ASSET_BASE_PATH, RESULTS_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataSimulationCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

export async function* getCircuitSimulationFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<Record<string, any>>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.SingleNeuronSimulation);
  } catch {}

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };
    const campaign = await getCircuitSimulationCampaign({
      id: entityId,
      context: ctx,
    });
    const simulations = await getCircuitSimulations({
      context: ctx,
      filters: { simulation_campaign_id: campaign.id },
    });
    const configAsset = campaign.assets.find(
      (asset) => asset.label === 'campaign_generation_config'
    )!;
    try {
      const path = `${dataPath}/${configAsset.path}`;
      yield await createAssetFileEntry({
        entity: campaign,
        asset: configAsset,
        path,
        ctx,
      });
    } catch {}

    const simulationFullObject: Record<
      string,
      {
        executions: Array<ICircuitSimulationExecution>;
        results: Array<ICircuitSimulationResult>;
      }
    > = {};
    for (const sim of simulations.data) {
      const executions = await getCircuitSimulationExecutions({
        context: ctx,
        withFacets: false,
        filters: { used__id__in: sim.id },
      });
      const generatedExecutions = compact(
        executions.data.flatMap((e) =>
          e.generated?.map((g) => ({
            executionId: e.id,
            generatedId: g.id,
          }))
        )
      );
      const results = await pMap(
        generatedExecutions,
        async (r) => {
          return await getCircuitSimulationResult({
            id: r.generatedId,
            context: ctx,
          });
        },
        { concurrency: 3 }
      );

      simulationFullObject[sim.id] = {
        executions: executions.data,
        results,
      };

      const resultsPath = `${dataPath}/${RESULTS_BASE_PATH}`;
      for (const [_, el] of results.entries()) {
        const basePath = `${resultsPath}/${el.simulation_id}`;
        for (const r of el.assets) {
          try {
            const path = `${basePath}/${r.path}`;
            yield await createAssetFileEntry({
              entity: el,
              asset: r,
              path,
              ctx,
            });
          } catch {}
        }
      }
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
