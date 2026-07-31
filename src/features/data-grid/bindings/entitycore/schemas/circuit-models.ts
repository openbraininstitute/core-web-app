import { CircuitScale, CircuitTargetSimulator } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { Align, FilterOptionsKind, OperatorId } from '../../../core';
import {
  createdByColumn,
  nameColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IColumnModel, IGridSchema } from '../../../core';
import type { IEntityGridDefinition } from '../registry';

/**
 * Re-authored grid schemas for the "circuit-family" plain models (micro-, small-micro-,
 * paired-neuron-, whole-brain, single-neuron circuits and the brain-region browse). These
 * mirror the shared circuit column presentation (`schemas/circuit.tsx`) MINUS the flat↔
 * hierarchy plugin — they are flat listings with no recursive subcircuit expansion.
 *
 * The collapsed columns follow each entity's legacy `view-defs/model/*` order. Filters and
 * sorts are bound to what the BACKEND accepts, not to the legacy per-type field metadata:
 * every family member is served by `GET /circuit` through the same `CircuitFilter`, so the
 * accepted query params and `CircuitFilter.Constants.ordering_model_fields` are identical
 * across all six. The legacy `order.types` / per-type filter rules were a UI-side
 * restriction, so brain region, species, scale, the three counters, target simulator and
 * created-by are sortable — and species filterable — for ALL of them.
 *
 * The one deliberate omission is the Scale column filter: each of these dataTypes narrows
 * `scale__in` to its own scale in the entity domain config (`circuitScaleFilter`), and a
 * user-supplied `scale__in` would override that narrowing and dissolve the listing's
 * identity. Only the base `circuit` dataType (`schemas/circuit.tsx`) exposes it.
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
function numberColumn(id: string, header: string, field: string): IColumnModel<ICircuit> {
  return {
    id,
    header,
    align: Align.Right,
    sortable: true,
    sortField: field,
    width: { minWidth: 130 },
    getValue: (row) => localizedNumber((row as unknown as Record<string, number>)[field]),
    filter: { operators: [OperatorId.Range], field },
  };
}

interface BuildOptions {
  dataType: string;
  id: string;
  /** brain_region's legacy view-def omits the Target simulator column */
  includeTargetSimulator: boolean;
}

function buildCircuitModelDefinition({
  dataType,
  id,
  includeTargetSimulator,
}: BuildOptions): IEntityGridDefinition<ICircuit> {
  const columns: Array<IColumnModel<ICircuit>> = [
    nameColumn<ICircuit>({ id: EntityCoreFields.Name }),
    // Description is display-only: /circuit exposes no `description` query param at all
    // (free-text description search goes through the quick-search box).
    {
      id: EntityCoreFields.Description,
      header: 'Description',
      getValue: (row) => row.description ?? '',
      width: { minWidth: 200, flex: 2 },
    },
    // Brain region: `brain_region__name__in` / `__ilike` + the `brain_region` facet come
    // from the shared catalog factory; region gating (`within_brain_region_*`) still applies
    // on top. ICircuit's type omits `brain_region` (present on the wire) — read it via a
    // cast, same as circuit.tsx.
    {
      id: EntityCoreFields.BrainRegion,
      header: 'Brain region',
      sortable: true,
      sortField: 'brain_region__name',
      width: { minWidth: 150, flex: 1 },
      getValue: (row) =>
        (row as unknown as { brain_region?: { name?: string | null } }).brain_region?.name ?? '',
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'brain_region__name',
        facetKey: 'brain_region',
        description: 'Brain region',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    speciesColumn<ICircuit>({ id: EntityCoreFields.SpeciesName }),
    // Scale: sortable, but NOT filterable — see the module doc (the dataType's own
    // `scale__in` narrowing would be overridden by a user-supplied scale filter).
    {
      id: EntityCoreFields.CircuitScale,
      header: 'Scale',
      align: Align.Left,
      sortable: true,
      sortField: 'scale',
      width: { width: 120, minWidth: 100 },
      getValue: (row) => CircuitScale[keyByValue(CircuitScale, row.scale)]?.label ?? '',
    },
    numberColumn(EntityCoreFields.CircuitNumberNeurons, 'Number of neurons', 'number_neurons'),
    numberColumn(EntityCoreFields.CircuitNumberSynapses, 'Number of synapses', 'number_synapses'),
    numberColumn(
      EntityCoreFields.CircuitNumberConnections,
      'Number of connections',
      'number_connections'
    ),
  ];

  if (includeTargetSimulator) {
    columns.push({
      id: EntityCoreFields.CircuitTargetSimulator,
      header: 'Target simulator',
      align: Align.Left,
      sortable: true,
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
          kind: FilterOptionsKind.Static,
          items: Object.values(CircuitTargetSimulator).map((s) => ({ id: s.key, label: s.label })),
        },
      },
    });
  }

  columns.push(
    createdByColumn<ICircuit>({
      id: EntityCoreFields.CreatedBy,
      sortable: true,
      sortField: 'created_by__pref_label',
    }),
    registrationDateColumn<ICircuit>({ id: EntityCoreFields.RegistrationDate })
  );

  const schema: IGridSchema<ICircuit> = {
    id,
    getRowId: (row) => row.id,
    // Shared row selection + bulk download replace the legacy antd per-row Download action.
    selection: { enabled: true },
    columns,
  };

  return { dataType, schema };
}

export const microCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.Microcircuit,
  id: 'micro-circuit',
  includeTargetSimulator: true,
});

export const smallMicroCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
  id: 'small-micro-circuit',
  includeTargetSimulator: true,
});

export const pairedNeuronCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
  id: 'paired-neuron-circuit',
  includeTargetSimulator: true,
});

export const wholeBrainGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.WholeBrain,
  id: 'whole-brain',
  includeTargetSimulator: true,
});

export const singleNeuronCircuitGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  id: 'single-neuron-circuit',
  includeTargetSimulator: true,
});

export const brainRegionGridDefinition = buildCircuitModelDefinition({
  dataType: ExtendedEntitiesTypeDict.BrainRegion,
  id: 'brain-region',
  // The brain-region browse is the only family member whose legacy view-def omits the
  // Target simulator column.
  includeTargetSimulator: false,
});

/** All circuit-family model grid definitions, keyed by dataType in the registry. */
export const circuitModelGridDefinitions: Array<IEntityGridDefinition<ICircuit>> = [
  microCircuitGridDefinition,
  smallMicroCircuitGridDefinition,
  pairedNeuronCircuitGridDefinition,
  wholeBrainGridDefinition,
  singleNeuronCircuitGridDefinition,
  brainRegionGridDefinition,
];
