import { analysisNotebookResultGridDefinition } from './schemas/analysis-notebook-result';
import { analysisNotebookTemplateGridDefinition } from './schemas/analysis-notebook-template';
import { cellMorphologyGridDefinition } from './schemas/cell-morphology';
import { circuitGridDefinition } from './schemas/circuit';
import { circuitModelGridDefinitions } from './schemas/circuit-models';
import { circuitSimulationGridDefinitions } from './schemas/circuit-simulations';
import { electricalCellRecordingGridDefinition } from './schemas/electrical-cell-recording';
import { emCellMeshGridDefinition } from './schemas/em-cell-mesh';
import { emodelGridDefinition } from './schemas/emodel';
import { experimentalBoutonDensityGridDefinition } from './schemas/experimental-bouton-density';
import { experimentalNeuronDensityGridDefinition } from './schemas/experimental-neuron-density';
import { experimentalSynapsesPerConnectionGridDefinition } from './schemas/experimental-synapses-per-connection';
import { extracellularRecordingArrayGridDefinition } from './schemas/extracellular-recording-array';
import { ionChannelModelGridDefinition } from './schemas/ion-channel-model';
import { ionChannelRecordingGridDefinition } from './schemas/ion-channel-recording';
import { meModelCircuitGridDefinition } from './schemas/me-model-circuit';
import { memodelGridDefinition } from './schemas/memodel';
import { simulationCampaignGridDefinition } from './schemas/simulation-campaign';
import { singleNeuronSimulationGridDefinition } from './schemas/single-neuron-simulation';
import { singleNeuronSynaptomeGridDefinition } from './schemas/single-neuron-synaptome';
import { singleNeuronSynaptomeSimulationGridDefinition } from './schemas/single-neuron-synaptome-simulation';
import { synthesizedCellMorphologyGridDefinition } from './schemas/synthesized-cell-morphology';
import { universalCellMorphologyGridDefinition } from './schemas/universal-cell-morphology';

import type { FC } from 'react';
import type { IGridSchema } from '../../core';
import type { IBrowseEntityGridProps } from '../../host/browse-entity-grid';
import type { CellRendererRegistry, TDetailRenderFn } from '../../react';

/**
 * Pairs an {@link IGridSchema} with a `dataType`. The query layer (endpoint,
 * narrowFilters, search mode, facets) is not duplicated here: the data source reads it
 * from the entity's domain config via `dataType`.
 */
export interface IEntityGridDefinition<Row> {
  /** ExtendedEntitiesTypeDict value; routes the host AND keys the domain config */
  dataType: string;
  schema: IGridSchema<Row>;
  /** registers this entity's cell renderers into a shared registry */
  registerCellRenderers?: (registry: CellRendererRegistry) => void;
  /** renderer for the schema's `detail` spec (full-width expanded rows) */
  renderDetail?: TDetailRenderFn<Row>;
  /**
   * Custom plugin body rendered instead of the shared `EntityDataGrid`; it owns its own
   * state and wraps `EntityDataGrid` with strategy overrides.
   */
  plugin?: { Body: FC<IBrowseEntityGridProps> };
}

// biome-ignore lint/suspicious/noExplicitAny: registry holds heterogeneous row types per entity
export type TAnyEntityGridDefinition = IEntityGridDefinition<any>;

/**
 * dataType → grid definition. Per-entity flip switch: a registered dataType routes
 * `BrowseEntityScope` to the AG Grid host, removing the entry falls back to the legacy
 * antd table.
 */
const definitions: Record<string, TAnyEntityGridDefinition> = {
  [cellMorphologyGridDefinition.dataType]: cellMorphologyGridDefinition,
  [electricalCellRecordingGridDefinition.dataType]: electricalCellRecordingGridDefinition,
  [ionChannelRecordingGridDefinition.dataType]: ionChannelRecordingGridDefinition,
  [universalCellMorphologyGridDefinition.dataType]: universalCellMorphologyGridDefinition,
  [synthesizedCellMorphologyGridDefinition.dataType]: synthesizedCellMorphologyGridDefinition,
  [experimentalNeuronDensityGridDefinition.dataType]: experimentalNeuronDensityGridDefinition,
  [experimentalBoutonDensityGridDefinition.dataType]: experimentalBoutonDensityGridDefinition,
  [experimentalSynapsesPerConnectionGridDefinition.dataType]:
    experimentalSynapsesPerConnectionGridDefinition,
  [emCellMeshGridDefinition.dataType]: emCellMeshGridDefinition,
  [emodelGridDefinition.dataType]: emodelGridDefinition,
  [memodelGridDefinition.dataType]: memodelGridDefinition,
  [meModelCircuitGridDefinition.dataType]: meModelCircuitGridDefinition,
  [singleNeuronSynaptomeGridDefinition.dataType]: singleNeuronSynaptomeGridDefinition,
  [ionChannelModelGridDefinition.dataType]: ionChannelModelGridDefinition,
  [analysisNotebookTemplateGridDefinition.dataType]: analysisNotebookTemplateGridDefinition,
  [analysisNotebookResultGridDefinition.dataType]: analysisNotebookResultGridDefinition,
  [extracellularRecordingArrayGridDefinition.dataType]: extracellularRecordingArrayGridDefinition,
  [singleNeuronSimulationGridDefinition.dataType]: singleNeuronSimulationGridDefinition,
  [singleNeuronSynaptomeSimulationGridDefinition.dataType]:
    singleNeuronSynaptomeSimulationGridDefinition,
  ...Object.fromEntries(circuitModelGridDefinitions.map((def) => [def.dataType, def])),
  ...Object.fromEntries(circuitSimulationGridDefinitions.map((def) => [def.dataType, def])),
  [simulationCampaignGridDefinition.dataType]: simulationCampaignGridDefinition,
  [circuitGridDefinition.dataType]: circuitGridDefinition,
};

export function getEntityGridDefinition(dataType: string): TAnyEntityGridDefinition | undefined {
  return definitions[dataType];
}
