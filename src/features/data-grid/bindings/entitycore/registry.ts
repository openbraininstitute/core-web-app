import { cellMorphologyGridDefinition } from './schemas/cell-morphology';
import { circuitGridDefinition } from './schemas/circuit';
import { circuitSimulationGridDefinitions } from './schemas/circuit-simulations';
import { electricalCellRecordingGridDefinition } from './schemas/electrical-cell-recording';
import { emCellMeshGridDefinition } from './schemas/em-cell-mesh';
import { experimentalBoutonDensityGridDefinition } from './schemas/experimental-bouton-density';
import { experimentalNeuronDensityGridDefinition } from './schemas/experimental-neuron-density';
import { experimentalSynapsesPerConnectionGridDefinition } from './schemas/experimental-synapses-per-connection';
import { ionChannelRecordingGridDefinition } from './schemas/ion-channel-recording';
import { synthesizedCellMorphologyGridDefinition } from './schemas/synthesized-cell-morphology';
import { universalCellMorphologyGridDefinition } from './schemas/universal-cell-morphology';

import type { FC } from 'react';
import type { GridSchema } from '../../core';
import type { BrowseEntityGridProps } from '../../host/browse-entity-grid';
import type { CellRendererRegistry, DetailRenderFn } from '../../react';

/**
 * An entity grid definition pairs a re-authored {@link GridSchema} (table
 * presentation) with a `dataType`. The query layer (endpoint, narrowFilters,
 * search mode, facets) is NOT duplicated here — the data source reads it from the
 * entity's domain config via `dataType`, keeping a single source of truth.
 */
export interface EntityGridDefinition<Row> {
  /** ExtendedEntitiesTypeDict value; routes the host AND keys the domain config */
  dataType: string;
  schema: GridSchema<Row>;
  /** registers this entity's cell renderers into a shared registry */
  registerCellRenderers?: (registry: CellRendererRegistry) => void;
  /** renderer for the schema's `detail` spec (full-width expanded rows) */
  renderDetail?: DetailRenderFn<Row>;
  /**
   * Optional custom-entity PLUGIN body. When present, `BrowseEntityGrid` renders it
   * instead of the shared `EntityDataGrid`; the body owns its own state and wraps
   * `EntityDataGrid` with strategy overrides (e.g. circuit's flat↔hierarchy toggle
   * + recursive subcircuit expansion). Absent for standard entities (unchanged).
   */
  plugin?: { Body: FC<BrowseEntityGridProps> };
}

// biome-ignore lint/suspicious/noExplicitAny: registry holds heterogeneous row types per entity
export type AnyEntityGridDefinition = EntityGridDefinition<any>;

/**
 * dataType → grid definition, built statically from the authored schema modules.
 * This is THE per-entity flip switch: a registered dataType routes
 * `BrowseEntityScope` to the AG Grid host; removing the entry rolls it back to the
 * legacy antd table. Grows one entry per re-authored entity.
 */
const definitions: Record<string, AnyEntityGridDefinition> = {
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
  // T-05: expandable circuit-simulation dataTypes flipped to full-width detail rows.
  ...Object.fromEntries(circuitSimulationGridDefinitions.map((def) => [def.dataType, def])),
  // Circuit listing flipped onto the shared stack via a PLUGIN body (flat↔hierarchy
  // toggle + recursive subcircuit expansion). Rollback = remove this one line.
  [circuitGridDefinition.dataType]: circuitGridDefinition,
};

export function getEntityGridDefinition(dataType: string): AnyEntityGridDefinition | undefined {
  return definitions[dataType];
}
