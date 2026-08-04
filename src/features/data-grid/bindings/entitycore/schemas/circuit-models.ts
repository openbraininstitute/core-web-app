import {
  CircuitBuildCategory,
  CircuitScale,
  CircuitTargetSimulator,
} from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

import { Align, FilterOptionsKind, FreeEntryKind, OperatorId } from '../../../core';
import {
  createdByColumn,
  nameColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';
import {
  flatAdvancedFilters,
  recordIdFilter,
  staticOptions,
  subjectAdvancedGroup,
} from './common-filters';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type {
  IAdvancedFilterGroup,
  IColumnModel,
  IGridSchema,
  TAdvancedFilterDef,
} from '../../../core';
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

/**
 * ADVANCED FILTERS for the WHOLE circuit family — `GET /circuit` params that no
 * circuit listing shows a column for. Every family member is served by the same
 * `CircuitFilter`, so one declaration covers them all; the two flags carve out the
 * fields a given listing DOES show as a column (`filter.targets` already own those).
 *
 * Every field/operator pair was checked against the live OpenAPI spec; the emitted
 * param is named in each comment.
 *
 * Two deliberate omissions:
 *  - `scale` — every dataType in this module pins `scale__in` to its own scale in the
 *    entity domain config (`circuitScaleFilter`). For `paired_neuron_circuit` and
 *    `single_neuron_circuit` the host spread wins outright (`{...filters, ...scale}`),
 *    and for the others a user-supplied scale would dissolve the listing's identity.
 *  - `published_in*`, `experiment_date__*`, `contact_email`, `lifecycle_status` —
 *    record metadata the advanced-filter surface does not carry (see the sibling
 *    schemas); registration date already has a column.
 */
export function buildCircuitAdvancedFilters({
  includeBuildCategory,
  includeTargetSimulator,
  includeContents = true,
  includeSubject = true,
  includeContribution = true,
}: {
  /** true where the listing shows NO Build category column */
  includeBuildCategory: boolean;
  /** true where the listing shows NO Target simulator column (brain-region browse) */
  includeTargetSimulator: boolean;
  /** true where the listing shows NO column for the four `has_*` content flags */
  includeContents?: boolean;
  /** true where the listing shows NO Strain / Subject name column */
  includeSubject?: boolean;
  /** true where the listing shows NO Contributors column */
  includeContribution?: boolean;
}): ReadonlyArray<IAdvancedFilterGroup> {
  const classification: Array<IAdvancedFilterGroup> = [];
  const classificationFilters: Array<TAdvancedFilterDef> = [];
  if (includeBuildCategory) {
    classificationFilters.push({
      id: 'buildCategory',
      label: 'Build category',
      // `build_category__in`, `build_category` (exact). No `__not_in`.
      field: 'build_category',
      operators: [OperatorId.In, OperatorId.Eq],
      options: staticOptions(CircuitBuildCategory),
    });
  }
  if (includeTargetSimulator) {
    classificationFilters.push({
      id: 'targetSimulator',
      label: 'Target simulator',
      // `target_simulator__in`, `target_simulator` (exact). No `__not_in`.
      field: 'target_simulator',
      operators: [OperatorId.In, OperatorId.Eq],
      options: staticOptions(CircuitTargetSimulator),
    });
  }
  if (classificationFilters.length > 0) {
    classification.push({
      id: 'classification',
      label: 'Classification',
      filters: classificationFilters,
    });
  }

  const contents: Array<IAdvancedFilterGroup> = includeContents
    ? [
        {
          id: 'contents',
          label: 'Contents',
          description: 'What the circuit is built out of. No column shows these.',
          filters: [
            {
              id: 'hasMorphologies',
              label: 'Has morphologies',
              // `has_morphologies` (boolean)
              field: 'has_morphologies',
              operators: [OperatorId.Bool],
            },
            {
              id: 'hasPointNeurons',
              label: 'Has point neurons',
              // `has_point_neurons` (boolean)
              field: 'has_point_neurons',
              operators: [OperatorId.Bool],
            },
            {
              id: 'hasElectricalCellModels',
              label: 'Has electrical cell models',
              // `has_electrical_cell_models` (boolean)
              field: 'has_electrical_cell_models',
              operators: [OperatorId.Bool],
              description: 'Circuits with electrical cell models are the simulatable ones',
            },
            {
              id: 'hasSpines',
              label: 'Has spines',
              // `has_spines` (boolean)
              field: 'has_spines',
              operators: [OperatorId.Bool],
            },
          ],
        },
      ]
    : [];

  return [
    {
      id: 'common',
      label: 'Common',
      filters: [recordIdFilter],
    },
    ...classification,
    ...contents,
    {
      id: 'provenance',
      label: 'Provenance',
      filters: [
        {
          id: 'atlasId',
          label: 'Atlas ID',
          // `atlas_id` (exact UUID) ONLY — no list form.
          field: 'atlas_id',
          operators: [OperatorId.Eq],
          description: 'The brain atlas the circuit was built against',
        },
        {
          id: 'rootCircuitId',
          label: 'Root circuit ID',
          // `root_circuit_id` (exact UUID) ONLY — no list form.
          field: 'root_circuit_id',
          operators: [OperatorId.Eq],
          description: 'Circuits belonging to one root circuit, subcircuits included',
        },
      ],
    },
    ...(includeSubject ? [subjectAdvancedGroup('The animal the circuit models.')] : []),
    ...(includeContribution
      ? [
          {
            id: 'contribution',
            label: 'Contributors',
            filters: [
              {
                id: 'prefLabel',
                label: 'Contributor',
                // `contribution__pref_label__ilike`, `contribution__pref_label__in`. The
                // circuit-family listings show no Contributors column.
                field: 'contribution__pref_label',
                operators: [OperatorId.Ilike, OperatorId.In],
                freeEntry: FreeEntryKind.Text,
                placeholder: 'Enter a contributor name',
              },
            ],
          } satisfies IAdvancedFilterGroup,
        ]
      : []),
  ];
}

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
    nameColumn<ICircuit>({ id: EntityCoreFields.Name, essential: true }),
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
    // flat list, no group tabs — see `flatAdvancedFilters`. Build category has no
    // column here; Target simulator only lacks one on the brain-region browse.
    advancedFilters: flatAdvancedFilters(
      buildCircuitAdvancedFilters({
        includeBuildCategory: true,
        includeTargetSimulator: !includeTargetSimulator,
      })
    ),
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
