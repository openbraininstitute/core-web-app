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
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { makeCampaignScanTableRenderDetail } from '@/features/data-grid/bindings/entitycore/renderers/campaign-scan-table';
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
} from '@/features/data-grid/bindings/entitycore/schemas/campaign-common';
import { mergeColumnDef, SortDirection } from '@/features/data-grid/core';

import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IColumnModel, IGridSchema, TColumnOverride } from '@/features/data-grid/core';

/**
 * Grid schemas for the expandable circuit-simulation dataTypes. Each pairs collapsed
 * columns with a full-width detail row driven by the entity's registered
 * {@link ListExpandedViewConfig}.
 */

interface BuildOptions {
  dataType: string;
  id: string;
  /** Expanded-view config; consumed only in nested mode. */
  // biome-ignore lint/suspicious/noExplicitAny: viewConfig row type is entity-specific; forwarded verbatim to render
  viewConfig: ListExpandedViewConfig<any>;
  /** every variant shows a Circuit column except ion-channel */
  withCircuit?: boolean;
  /** memodel circuit simulation adds a Species column */
  withSpecies?: boolean;
  /** see {@link CAMPAIGN_NESTED_MODE_DEFAULT} */
  nestedMode?: boolean;
  /** Per-column field overrides applied after the default set is composed. */
  columnOverrides?: Partial<Record<string, TColumnOverride<ICampaignRow>>>;
}

function applyColumnOverrides(
  columns: Array<IColumnModel<ICampaignRow>>,
  overrides?: Partial<Record<string, TColumnOverride<ICampaignRow>>>
): Array<IColumnModel<ICampaignRow>> {
  if (!overrides) return columns;
  return columns.map((column) => {
    const override = overrides[column.id];
    return override ? mergeColumnDef(column, override) : column;
  });
}

export function buildSimulationCampaignDefinition({
  dataType,
  id,
  withCircuit = true,
  withSpecies = false,
  nestedMode = CAMPAIGN_NESTED_MODE_DEFAULT,
  columnOverrides,
}: BuildOptions): IEntityGridDefinition<ICampaignRow> {
  const columns = applyColumnOverrides(
    [
      campaignNameColumn<ICampaignRow>({ essential: true }),
      campaignDescriptionColumn<ICampaignRow>(),
      ...(withCircuit ? [circuitNameColumn<ICampaignRow>()] : []),
      campaignCreatedByColumn<ICampaignRow>({
        sortable: true,
        sortField: 'created_by__pref_label',
      }),
      ...(withSpecies ? [campaignSpeciesColumn<ICampaignRow>()] : []),
      lifecycleStatusColumn<ICampaignRow>(),
      campaignRegistrationDateColumn<ICampaignRow>({ essential: true }),
      campaignStatusColumn<ICampaignRow>({ essential: true }),
    ],
    columnOverrides
  );

  const schema: IGridSchema<ICampaignRow> = {
    id,
    getRowId: (row) => row.id,
    defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
    columns,
    ...(nestedMode ? { detail: campaignDetailSpec<ICampaignRow>() } : {}),
  };

  return {
    dataType,
    schema,
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
  columnOverrides: {
    circuitName: {
      header: 'ME-model',
      filter: { description: 'ME-model' },
    },
  },
});

export const ionChannelModelSimulationGridDefinition = buildSimulationCampaignDefinition({
  dataType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  id: 'ion-channel-model-simulation',
  viewConfig: ionChannelSimulationExpandedViewConfig,
  withCircuit: false,
});

/** All circuit-simulation grid definitions, keyed by dataType. */
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
