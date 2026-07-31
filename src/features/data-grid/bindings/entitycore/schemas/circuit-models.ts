import { CircuitScale, CircuitTargetSimulator } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { OperatorId } from '../../../core';
import {
  createdByColumn,
  nameColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ColumnModel, GridSchema } from '../../../core';
import type { EntityGridDefinition } from '../registry';

/**
 * Re-authored grid schemas for the "circuit-family" plain models (micro-, small-micro-,
 * paired-neuron-, whole-brain, single-neuron circuits and the brain-region browse). These
 * mirror the shared circuit column presentation (`schemas/circuit.tsx`) MINUS the flat↔
 * hierarchy plugin — they are flat listings with no recursive subcircuit expansion.
 *
 * The collapsed columns follow each entity's legacy `view-defs/model/*` order; per-column
 * server filters/sorts are locked to the legacy field metadata (`fields-defs/model.tsx` +
 * `fields-defs/common.tsx`) by the model-parity test, NOT copied wholesale from the circuit
 * schema — several sorts/filters that Circuit has are absent for these types (see per-entity
 * flags below and the parity test's per-type expectations).
 *
 * Legacy view-def column order (per `view-defs/model/*`):
 *   Name, Description, Brain region, Species, Scale, N° neurons, N° synapses, N° connections,
 *   [Target simulator — every family member except brain_region], Created by, Registration date
 */

/** Localized integer, matching the legacy `renderLocalizedNumber`. */
function localizedNumber(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? '' : value.toLocaleString();
}

/** Reverse-lookup a dictionary's enum KEY from a stored value `key` (matches circuit.tsx). */
function keyByValue<T extends Record<string, { key: string }>>(
  dict: T,
  value: string | null | undefined
): keyof T {
  return (Object.keys(dict) as Array<keyof T>).find((k) => dict[k].key === value) as keyof T;
}

/** ValueRange number column (localized display, `field__gte`/`field__lte` filter). */
function numberColumn(
  id: string,
  header: string,
  field: string,
  sortable: boolean
): ColumnModel<ICircuit> {
  return {
    id,
    header,
    align: 'right',
    sortable,
    sortField: field,
    width: { minWidth: 130 },
    getValue: (row) => localizedNumber((row as unknown as Record<string, number>)[field]),
    filter: { operators: [OperatorId.Range], field },
  };
}

/** Per-entity sort availability (mirrors each field-def's `order.types` membership). */
interface CircuitModelSorts {
  brainRegion: boolean;
  species: boolean;
  scale: boolean;
  numbers: boolean;
  targetSimulator: boolean;
  createdBy: boolean;
}

interface BuildOptions {
  dataType: string;
  id: string;
  sorts: CircuitModelSorts;
  /** whether the Species column exposes the `subject__species__name` facet filter */
  speciesFilter: boolean;
  /** brain_region's legacy view-def omits the Target simulator column */
  includeTargetSimulator: boolean;
}

function buildCircuitModelDefinition({
  dataType,
  id,
  sorts,
  speciesFilter,
  includeTargetSimulator,
}: BuildOptions): EntityGridDefinition<ICircuit> {
  const columns: Array<ColumnModel<ICircuit>> = [
    nameColumn<ICircuit>({ id: EntityCoreFields.Name }),
    // Description is display-only: the legacy field (`fields-defs/common.tsx`) is
    // `isFilterable: false` with a `search` constraint (the quick-search box, not a column
    // filter), so NO per-column ilike filter is declared here.
    {
      id: EntityCoreFields.Description,
      header: 'Description',
      getValue: (row) => row.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    // Brain region: no filter (region gating owns filtering); sortable only where the
    // field-def's `order.types` includes this entity. ICircuit's type omits `brain_region`
    // (present on the wire) — read it via a cast, same as circuit.tsx.
    {
      id: EntityCoreFields.BrainRegion,
      header: 'Brain region',
      sortable: sorts.brainRegion,
      sortField: 'brain_region__name',
      width: { minWidth: 150, flex: 1 },
      getValue: (row) =>
        (row as unknown as { brain_region?: { name?: string | null } }).brain_region?.name ?? '',
    },
    speciesFilter
      ? speciesColumn<ICircuit>({ id: EntityCoreFields.SpeciesName, sortable: sorts.species })
      : // whole_brain: species has no legacy filter rule → display-only.
        {
          id: EntityCoreFields.SpeciesName,
          header: 'Species',
          sortable: sorts.species,
          sortField: 'subject__species__name',
          width: { minWidth: 140, flex: 1 },
          getValue: (row) => row.subject?.species?.name ?? '',
        },
    // Scale: no filter for these types (only the base Circuit dataType enables the scale
    // filter in the legacy field-def); sortable per `order.types`.
    {
      id: EntityCoreFields.CircuitScale,
      header: 'Scale',
      align: 'left',
      sortable: sorts.scale,
      sortField: 'scale',
      width: { width: 120, minWidth: 100 },
      getValue: (row) => CircuitScale[keyByValue(CircuitScale, row.scale)]?.label ?? '',
    },
    numberColumn(
      EntityCoreFields.CircuitNumberNeurons,
      'Number of neurons',
      'number_neurons',
      sorts.numbers
    ),
    numberColumn(
      EntityCoreFields.CircuitNumberSynapses,
      'Number of synapses',
      'number_synapses',
      sorts.numbers
    ),
    numberColumn(
      EntityCoreFields.CircuitNumberConnections,
      'Number of connections',
      'number_connections',
      sorts.numbers
    ),
  ];

  if (includeTargetSimulator) {
    columns.push({
      id: EntityCoreFields.CircuitTargetSimulator,
      header: 'Target simulator',
      align: 'left',
      sortable: sorts.targetSimulator,
      sortField: 'target_simulator',
      width: { minWidth: 150, flex: 1 },
      getValue: (row) =>
        row.target_simulator
          ? (CircuitTargetSimulator[keyByValue(CircuitTargetSimulator, row.target_simulator)]
              ?.label ?? '')
          : '',
      filter: {
        operators: [OperatorId.In],
        field: 'target_simulator',
        options: {
          kind: 'static',
          items: Object.values(CircuitTargetSimulator).map((s) => ({ id: s.key, label: s.label })),
        },
      },
    });
  }

  columns.push(
    createdByColumn<ICircuit>({
      id: EntityCoreFields.CreatedBy,
      sortable: sorts.createdBy,
      sortField: 'created_by__pref_label',
    }),
    registrationDateColumn<ICircuit>({ id: EntityCoreFields.RegistrationDate })
  );

  const schema: GridSchema<ICircuit> = {
    id,
    getRowId: (row) => row.id,
    // Shared row selection + bulk download replace the legacy antd per-row Download action.
    selection: { enabled: true },
    columns,
  };

  return { dataType, schema };
}

/** Micro-, small-micro- and paired-neuron circuits share identical filter/sort metadata. */
const CIRCUIT_LIKE_SORTS: CircuitModelSorts = {
  brainRegion: true,
  species: false,
  scale: true,
  numbers: true,
  targetSimulator: true,
  createdBy: true,
};

export const microCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.Microcircuit,
  id: 'micro-circuit',
  sorts: CIRCUIT_LIKE_SORTS,
  speciesFilter: true,
  includeTargetSimulator: true,
});

export const smallMicroCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
  id: 'small-micro-circuit',
  sorts: CIRCUIT_LIKE_SORTS,
  speciesFilter: true,
  includeTargetSimulator: true,
});

export const pairedNeuronCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
  id: 'paired-neuron-circuit',
  sorts: CIRCUIT_LIKE_SORTS,
  speciesFilter: true,
  includeTargetSimulator: true,
});

export const wholeBrainGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.WholeBrain,
  id: 'whole-brain',
  // whole_brain appears only in target_simulator's `order.types` — every other sort is absent.
  sorts: {
    brainRegion: false,
    species: false,
    scale: false,
    numbers: false,
    targetSimulator: true,
    createdBy: false,
  },
  speciesFilter: false,
  includeTargetSimulator: true,
});

export const singleNeuronCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  id: 'single-neuron-circuit',
  // SingleNeuronCircuit is the only family member whose species column is server-sortable.
  sorts: {
    brainRegion: true,
    species: true,
    scale: true,
    numbers: true,
    targetSimulator: true,
    createdBy: true,
  },
  speciesFilter: true,
  includeTargetSimulator: true,
});

export const brainRegionGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.BrainRegion,
  id: 'brain-region',
  // brain_region is absent from every circuit field-def `order.types` → nothing sortable
  // except Name/Registration date (which are always sortable).
  sorts: {
    brainRegion: false,
    species: false,
    scale: false,
    numbers: false,
    targetSimulator: false,
    createdBy: false,
  },
  speciesFilter: true,
  includeTargetSimulator: false,
});

/** All circuit-family model grid definitions, keyed by dataType in the registry. */
export const circuitModelGridDefinitions: Array<EntityGridDefinition<ICircuit>> = [
  microCircuitGridDefinition,
  smallMicroCircuitGridDefinition,
  pairedNeuronCircuitGridDefinition,
  wholeBrainGridDefinition,
  singleNeuronCircuitGridDefinition,
  brainRegionGridDefinition,
];
