import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  ionChannelSimulationExpandedViewConfig,
  memodelCircuitSimulationExpandedViewConfig,
  microcircuitSimulationExpandedViewConfig,
  pairedNeuronsCircuitSimulationExpandedViewConfig,
  regionCircuitSimulationExpandedViewConfig,
  singleNeuronCircuitSimulationExpandedViewConfig,
  smallMicrocircuitSimulationExpandedViewConfig,
  wholeBrainCircuitSimulationExpandedViewConfig,
} from '@/entity-configuration/definitions/list-expanded-view-defs/simulation';

import { SortDirection } from '../../../core';
import { makeCampaignScanTableRenderDetail } from '../renderers/campaign-scan-table';
import {
  CAMPAIGN_NESTED_MODE_DEFAULT,
  campaignCreatedByColumn,
  campaignDescriptionColumn,
  campaignDetailSpec,
  campaignNameColumn,
  campaignRegistrationDateColumn,
  campaignSpeciesColumn,
  campaignStatusColumn,
  circuitNameColumn,
  type ICampaignRow,
  registerCampaignRenderers,
} from './campaign-common';

import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { IColumnModel, IGridSchema } from '../../../core';
import type { IEntityGridDefinition } from '../registry';

/**
 * Re-authored grid schemas for the expandable circuit-simulation dataTypes (T-05).
 * Each flips its legacy antd expandable table to an AG Grid listing with a full-width
 * DETAIL row: the collapsed columns mirror the entity's legacy view-def order, and the
 * `detail` spec + `renderDetail` reuse the entity's registered
 * {@link ListExpandedViewConfig} so the expanded content is byte-for-byte the legacy
 * SimpleGrid table. Column order is the parity contract locked by the tests.
 *
 * Legacy view-def column order (per `view-defs/simulation/*`):
 *   Name, Description, Circuit, Created by, [Species — memodel only], Registration date, Status
 */

interface BuildOptions {
  dataType: string;
  id: string;
  /**
   * Legacy expanded-view config for this dataType. Retained so the nested-table
   * byte-parity renderer (`makeCampaignRenderDetail`) stays available for rollback;
   * the default popover-cards mode does not consume it.
   */
  // biome-ignore lint/suspicious/noExplicitAny: viewConfig row type is entity-specific; forwarded verbatim to render
  viewConfig: ListExpandedViewConfig<any>;
  /** the circuit-simulation variants all show a "Circuit" column except ion-channel */
  withCircuit?: boolean;
  /** memodel circuit simulation adds a Species column */
  withSpecies?: boolean;
  /**
   * Presentation mode for the Status column. `false` (default) → popover-cards; `true`
   * → also wire the full-width nested scan-parameter table (see
   * {@link CAMPAIGN_NESTED_MODE_DEFAULT}). Exposed so tests can build a nested variant.
   */
  nestedMode?: boolean;
}

export function buildSimulationCampaignDefinition({
  dataType,
  id,
  withCircuit = true,
  withSpecies = false,
  nestedMode = CAMPAIGN_NESTED_MODE_DEFAULT,
}: BuildOptions): IEntityGridDefinition<ICampaignRow> {
  const columns: Array<IColumnModel<ICampaignRow>> = [
    campaignNameColumn<ICampaignRow>(),
    campaignDescriptionColumn<ICampaignRow>(),
    ...(withCircuit ? [circuitNameColumn<ICampaignRow>()] : []),
    // `created_by__pref_label` is in SimulationCampaignFilter's ordering fields.
    campaignCreatedByColumn<ICampaignRow>({
      sortable: true,
      sortField: 'created_by__pref_label',
    }),
    ...(withSpecies ? [campaignSpeciesColumn<ICampaignRow>()] : []),
    campaignRegistrationDateColumn<ICampaignRow>(),
    campaignStatusColumn<ICampaignRow>(),
  ];

  const schema: IGridSchema<ICampaignRow> = {
    id,
    getRowId: (row) => row.id,
    defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
    columns,
    // Popover-cards mode (default) wires NO full-width detail row, so the legacy
    // nested-table expander is not shown; nested mode restores it.
    ...(nestedMode ? { detail: campaignDetailSpec<ICampaignRow>() } : {}),
  };

  return {
    dataType,
    schema,
    // Nested mode swaps the expanded table's status cell to the new badge; popover-cards
    // mode needs no detail renderer.
    ...(nestedMode ? { renderDetail: makeCampaignScanTableRenderDetail() } : {}),
    registerCellRenderers: registerCampaignRenderers,
  };
}

export const regionCircuitSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  id: 'region-circuit-simulation',
  viewConfig: regionCircuitSimulationExpandedViewConfig,
});

export const wholeBrainCircuitSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
  id: 'whole-brain-circuit-simulation',
  viewConfig: wholeBrainCircuitSimulationExpandedViewConfig,
});

export const microcircuitSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  id: 'microcircuit-simulation',
  viewConfig: microcircuitSimulationExpandedViewConfig,
});

export const smallMicrocircuitSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  id: 'small-microcircuit-simulation',
  viewConfig: smallMicrocircuitSimulationExpandedViewConfig,
});

export const pairedNeuronCircuitSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  id: 'paired-neuron-circuit-simulation',
  viewConfig: pairedNeuronsCircuitSimulationExpandedViewConfig,
});

export const singleNeuronCircuitSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  id: 'single-neuron-circuit-simulation',
  viewConfig: singleNeuronCircuitSimulationExpandedViewConfig,
});

export const memodelCircuitSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  id: 'me-model-circuit-simulation',
  viewConfig: memodelCircuitSimulationExpandedViewConfig,
  withSpecies: true,
});

export const ionChannelModelSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  id: 'ion-channel-model-simulation',
  viewConfig: ionChannelSimulationExpandedViewConfig,
  withCircuit: false,
});

/** All circuit-simulation grid definitions flipped in T-05, keyed by dataType. */
export const circuitSimulationGridDefinitions: Array<IEntityGridDefinition<ICampaignRow>> = [
  regionCircuitSimulationGridDefinition,
  wholeBrainCircuitSimulationGridDefinition,
  microcircuitSimulationGridDefinition,
  smallMicrocircuitSimulationGridDefinition,
  pairedNeuronCircuitSimulationGridDefinition,
  singleNeuronCircuitSimulationGridDefinition,
  memodelCircuitSimulationGridDefinition,
  ionChannelModelSimulationGridDefinition,
];
