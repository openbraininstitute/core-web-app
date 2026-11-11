import {
  CircuitBuildCategory,
  CircuitScale,
  CircuitTargetSimulator,
} from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  createdByColumn,
  descriptionColumn,
  keyByValue,
  nameColumn,
  numberColumn,
  registrationDateColumn,
  speciesColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import {
  flatAdvancedFilters,
  recordIdFilter,
  staticOptions,
  subjectAdvancedGroup,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import { Align, FilterOptionsKind, FreeEntryKind, OperatorId } from '@/features/data-grid/core';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type {
  IAdvancedFilterGroup,
  IColumnModel,
  IGridSchema,
  TAdvancedFilterDef,
} from '@/features/data-grid/core';

/**
 * Grid schemas for the circuit-family plain models (micro-, small-micro-, paired-neuron-,
 * whole-brain, single-neuron circuits and the brain-region browse). All six are served by
 * `GET /circuit` through the same `CircuitFilter`, so accepted params and ordering fields
 * are identical across them.
 */

/**
 * `GET /circuit` params with no column, shared by the whole circuit family; the flags
 * carve out the fields a given listing already shows as a column.
 *
 * `scale` is deliberately absent: each dataType pins `scale__in` to its own scale in
 * the entity domain config, and a user-supplied scale would dissolve that narrowing.
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
      field: 'build_category',
      operators: [OperatorId.In, OperatorId.Eq],
      options: staticOptions(CircuitBuildCategory),
    });
  }
  if (includeTargetSimulator) {
    classificationFilters.push({
      id: 'targetSimulator',
      label: 'Target simulator',
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
              field: 'has_morphologies',
              operators: [OperatorId.Bool],
            },
            {
              id: 'hasPointNeurons',
              label: 'Has point neurons',
              field: 'has_point_neurons',
              operators: [OperatorId.Bool],
            },
            {
              id: 'hasElectricalCellModels',
              label: 'Has electrical cell models',
              field: 'has_electrical_cell_models',
              operators: [OperatorId.Bool],
              description: 'Circuits with electrical cell models are the simulatable ones',
            },
            {
              id: 'hasSpines',
              label: 'Has spines',
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
          // Exact UUID only — no list form.
          field: 'atlas_id',
          operators: [OperatorId.Eq],
          description: 'The brain atlas the circuit was built against',
        },
        {
          id: 'rootCircuitId',
          label: 'Root circuit ID',
          // Exact UUID only — no list form.
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

interface BuildOptions {
  dataType: string;
  id: string;
  /** false only for the brain-region browse, which has no Target simulator column */
  includeTargetSimulator: boolean;
}

function buildCircuitModelDefinition({
  dataType,
  id,
  includeTargetSimulator,
}: BuildOptions): IEntityGridDefinition<ICircuit> {
  const columns: Array<IColumnModel<ICircuit>> = [
    nameColumn<ICircuit>({ id: EntityCoreFields.Name, essential: true }),
    // Display-only: /circuit exposes no `description` query param.
    descriptionColumn<ICircuit>({ id: EntityCoreFields.Description }),
    // `brain_region` is on the wire but missing from `ICircuit`, hence the cast.
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
    // Sortable but not filterable: a user `scale__in` would override the dataType's
    // own narrowing.
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
      'number_connections',
      { width: { minWidth: 150, width: 150 } }
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
    lifecycleStatusColumn<ICircuit>(),
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
    rowHeight: 56,
    // No selection: workflow single-select browse has no checkboxes (parity with
    // legacy antd). Pickers that need them pass `selectionType` via mainTableProps.
    selection: { enabled: false },
    // Build category has no column here; Target simulator only lacks one on the
    // brain-region browse.
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
  // The only family member without a Target simulator column.
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
