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

import {
  type CampaignRow,
  campaignCreatedByColumn,
  campaignDescriptionColumn,
  campaignDetailSpec,
  campaignNameColumn,
  campaignRegistrationDateColumn,
  campaignSpeciesColumn,
  campaignStatusColumn,
  circuitNameColumn,
  makeCampaignRenderDetail,
  registerCampaignRenderers,
} from './campaign-common';

import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { ColumnModel, GridSchema } from '../../../core';
import type { EntityGridDefinition } from '../registry';

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
  // biome-ignore lint/suspicious/noExplicitAny: viewConfig row type is entity-specific; forwarded verbatim to render
  viewConfig: ListExpandedViewConfig<any>;
  /** the circuit-simulation variants all show a "Circuit" column except ion-channel */
  withCircuit?: boolean;
  /** memodel circuit simulation adds a Species column */
  withSpecies?: boolean;
}

function buildSimulationCampaignDefinition({
  dataType,
  id,
  viewConfig,
  withCircuit = true,
  withSpecies = false,
}: BuildOptions): EntityGridDefinition<CampaignRow> {
  const columns: Array<ColumnModel<CampaignRow>> = [
    campaignNameColumn<CampaignRow>(),
    campaignDescriptionColumn<CampaignRow>(),
    ...(withCircuit ? [circuitNameColumn<CampaignRow>()] : []),
    campaignCreatedByColumn<CampaignRow>(),
    ...(withSpecies ? [campaignSpeciesColumn<CampaignRow>()] : []),
    campaignRegistrationDateColumn<CampaignRow>(),
    campaignStatusColumn<CampaignRow>(),
  ];

  const schema: GridSchema<CampaignRow> = {
    id,
    getRowId: (row) => row.id,
    defaultSort: [{ columnId: 'registrationDate', direction: 'desc' }],
    columns,
    detail: campaignDetailSpec<CampaignRow>(),
  };

  return {
    dataType,
    schema,
    renderDetail: makeCampaignRenderDetail(viewConfig),
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
export const circuitSimulationGridDefinitions: Array<EntityGridDefinition<CampaignRow>> = [
  regionCircuitSimulationGridDefinition,
  wholeBrainCircuitSimulationGridDefinition,
  microcircuitSimulationGridDefinition,
  smallMicrocircuitSimulationGridDefinition,
  pairedNeuronCircuitSimulationGridDefinition,
  singleNeuronCircuitSimulationGridDefinition,
  memodelCircuitSimulationGridDefinition,
  ionChannelModelSimulationGridDefinition,
];
