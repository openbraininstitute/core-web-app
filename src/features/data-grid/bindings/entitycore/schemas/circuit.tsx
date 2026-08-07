import {
  CircuitBuildCategory,
  CircuitScale,
  CircuitTargetSimulator,
} from '@/api/entitycore/types/entities/circuit';
import {
  CircuitDerivationFilterOptions,
  getCircuitDerivationColumnLabels,
} from '@/api/entitycore/types/entities/derivation';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  contributionsColumn,
  descriptionColumn,
  nameColumn,
  speciesColumn,
  subjectNameColumn,
  subjectStrainColumn,
  yesNo,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { lifecycleStatusColumn } from '@/features/data-grid/bindings/entitycore/columns/lifecycle-status';
import { NUMERIC_FILTER_OPERATORS } from '@/features/data-grid/bindings/entitycore/columns/numeric-filter';
import { buildCircuitAdvancedFilters } from '@/features/data-grid/bindings/entitycore/schemas/circuit-models';
import {
  flatAdvancedFilters,
  staticOptions,
} from '@/features/data-grid/bindings/entitycore/schemas/common-filters';
import {
  Align,
  byContext,
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
} from '@/features/data-grid/core';
import { CircuitGridBody } from '@/features/data-grid/host/circuit-grid-body';
import {
  CIRCUIT_VIEW_FACTOR,
  CircuitRepresentationView,
  countDeepSubCircuits,
} from '@/ui/segments/explore/circuit/helpers';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IHasContributions } from '@/features/data-grid/bindings/entitycore/columns/catalog';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IColumnModel, IGridSchema } from '@/features/data-grid/core';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';

/**
 * The wire carries all four `has_*` flags and `contributions`, but `ICircuit` declares
 * only `has_electrical_cell_models`. Members stay optional so `ICircuit` remains
 * assignable to `Row`.
 */
type Row = ICircuit &
  IHasContributions & {
    has_morphologies?: boolean | null;
    has_point_neurons?: boolean | null;
    has_spines?: boolean | null;
  };

/**
 * `GET /circuit` params with no column here. Everything excluded is a column or
 * auxiliary column below, so each field lives on exactly one surface. `scale` is
 * omitted because the domain config narrows `scale__in` and the Scale column owns it.
 */
const circuitAdvancedFilters = buildCircuitAdvancedFilters({
  includeBuildCategory: false,
  includeTargetSimulator: false,
  includeContents: false,
  includeSubject: false,
  includeContribution: false,
});

/**
 * A `has_*` content flag as an auxiliary column. All four are in
 * `CircuitFilter.ordering_model_fields`, so they sort. The filter needs an explicit
 * target: with no options a flat filter falls back to facets, and the server computes
 * no facet bucket for these booleans.
 */
function circuitFlagColumn(
  id: string,
  header: string,
  field: string,
  description: string,
  get: (row: Row) => boolean | null | undefined
): IColumnModel<Row> {
  return {
    id,
    header,
    auxiliary: true,
    sortable: true,
    sortField: field,
    align: Align.Left,
    width: { minWidth: 150 },
    getValue: (row) => yesNo(get(row)),
    filter: {
      // Bare boolean param — `has_morphologies=true`, no `__op` suffix.
      operators: [OperatorId.Bool],
      field,
      targets: [{ id, label: header, field, operators: [OperatorId.Bool], description }],
    },
  };
}

/** Localized integer, matching the legacy `renderLocalizedNumber`. */
function localizedNumber(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? '' : value.toLocaleString();
}

/**
 * Circuit grid schema (`GET /circuit`). Column ids equal the {@link EntityCoreFields}
 * keys so the hidden-column set maps 1:1 onto the nested `CircuitRecursiveGrid`.
 */
export const circuitSchema: IGridSchema<Row> = {
  id: 'circuit',
  getRowId: (row) => row.id,
  // No selection spec: this listing has no checkboxes. Pickers are unaffected — they
  // supply their own `selectionType` through `mainTableProps`.
  // Sorting is off in the hierarchy view: rows there are a derivation tree and the
  // view-aware data source ignores `order_by`.
  sortable: byContext<boolean>({
    default: true,
    rules: [
      {
        when: { [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Hierarchy },
        value: false,
      },
    ],
  }),
  advancedFilters: flatAdvancedFilters(circuitAdvancedFilters),
  // Detail rows host the recursive subcircuit grid; the plugin body supplies the
  // runtime via `detailOverride`.
  detail: {
    rendererKey: 'circuit-subcircuits',
    isExpandable: (row) => {
      const enriched = row as ICircuitEnriched;
      return Boolean(enriched.sub_circuits && enriched.sub_circuits.length > 0);
    },
    minHeight: 120,
  },
  columns: [
    nameColumn<Row>({ id: EntityCoreFields.Name }),
    // Deny-by-default: only the Data section's hierarchy view renders the subtree this
    // counts, so availability turns on for `section: Data` + `CIRCUIT_VIEW_FACTOR:
    // Hierarchy` (published by `CircuitGridBody`). Other mounts resolve it away.
    {
      id: EntityCoreFields.CircuitSubCircuit,
      header: 'Subcircuits',
      available: byContext<boolean>({
        default: false,
        rules: [
          {
            when: {
              section: WorkspaceSection.Data,
              [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Hierarchy,
            },
            value: true,
          },
        ],
      }),
      align: Align.Left,
      movable: false,
      alwaysVisible: true,
      width: { width: 110, minWidth: 90 },
      getValue: (row) => {
        const enriched = row as ICircuitEnriched;
        return 'sub_circuits' in row ? countDeepSubCircuits(enriched) || '' : '';
      },
    } satisfies IColumnModel<Row>,
    descriptionColumn<Row>({ id: EntityCoreFields.Description }),
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
    } satisfies IColumnModel<Row>,
    speciesColumn<Row>({ id: EntityCoreFields.SpeciesName }),
    {
      id: EntityCoreFields.CircuitScale,
      header: 'Scale',
      align: Align.Left,
      sortable: true,
      sortField: 'scale',
      width: { width: 120, minWidth: 100 },
      getValue: (row) => CircuitScale[keyByValue(CircuitScale, row.scale)]?.label ?? '',
      filter: {
        operators: [OperatorId.In],
        field: 'scale',
        // All scales except "Single".
        options: {
          kind: FilterOptionsKind.Static,
          items: Object.values(CircuitScale)
            .filter((s) => s.key !== CircuitScale.Single.key)
            .map((s) => ({ id: s.key, label: s.label })),
        },
      },
    } satisfies IColumnModel<Row>,
    numberColumn(EntityCoreFields.CircuitNumberNeurons, 'Number of neurons', 'number_neurons'),
    numberColumn(EntityCoreFields.CircuitNumberSynapses, 'Number of synapses', 'number_synapses'),
    numberColumn(
      EntityCoreFields.CircuitNumberConnections,
      'Number of connections',
      'number_connections'
    ),
    {
      id: EntityCoreFields.CircuitBuildCategory,
      header: 'Build category',
      align: Align.Left,
      sortable: true,
      sortField: 'build_category',
      width: { minWidth: 140, flex: 1 },
      getValue: (row) =>
        CircuitBuildCategory[keyByValue(CircuitBuildCategory, row.build_category)]?.label ?? '',
      filter: {
        operators: [OperatorId.In],
        field: 'build_category',
        options: staticOptions(CircuitBuildCategory),
      },
    } satisfies IColumnModel<Row>,
    {
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
        options: staticOptions(CircuitTargetSimulator),
      },
    } satisfies IColumnModel<Row>,
    {
      id: EntityCoreFields.CircuitDerivationType,
      header: 'Derivation type',
      align: Align.Left,
      width: { minWidth: 140, flex: 1 },
      getValue: (row) => {
        const derivations =
          'generated_from_derivations' in row ? row.generated_from_derivations : null;
        const labels = derivations ? getCircuitDerivationColumnLabels(derivations) : [];
        return labels.length ? labels.join(', ') : '';
      },
      // Plain enum on the backend, not a facet. Not in the ordering fields.
      filter: {
        operators: [OperatorId.In],
        field: 'generated_derivation__derivation_type',
        options: {
          kind: FilterOptionsKind.Static,
          items: CircuitDerivationFilterOptions.map((o) => ({ id: o.value, label: o.label })),
        },
      },
    } satisfies IColumnModel<Row>,
    {
      id: EntityCoreFields.ArtifactPublishedIn,
      header: 'Published in',
      align: Align.Left,
      sortable: true,
      sortField: 'published_in',
      width: { minWidth: 150, flex: 1 },
      getValue: (row) => row.published_in ?? '',
      // /circuit exposes `published_in__ilike` only, no `__in`.
      filter: { operators: [OperatorId.Ilike], field: 'published_in' },
    } satisfies IColumnModel<Row>,
    {
      id: EntityCoreFields.ArtifactExperimentDate,
      header: 'Experiment date',
      align: Align.Left,
      sortable: true,
      sortField: 'experiment_date',
      width: { minWidth: 140 },
      getValue: (row) => formatDate(row.experiment_date),
      filter: { operators: [OperatorId.DateRange], field: 'experiment_date' },
    } satisfies IColumnModel<Row>,
    lifecycleStatusColumn<Row>(),
    // Auxiliary — hidden until ticked; each replaces an advanced filter. Every field
    // below is in `CircuitFilter.ordering_model_fields`, so all of them sort.
    circuitFlagColumn(
      'hasMorphologies',
      'Has morphologies',
      'has_morphologies',
      'Circuits whose cells carry reconstructed morphologies',
      (row) => row.has_morphologies
    ),
    circuitFlagColumn(
      'hasPointNeurons',
      'Has point neurons',
      'has_point_neurons',
      'Circuits containing point-neuron models',
      (row) => row.has_point_neurons
    ),
    circuitFlagColumn(
      'hasElectricalCellModels',
      'Has electrical cell models',
      'has_electrical_cell_models',
      'Circuits with electrical cell models are the simulatable ones',
      (row) => row.has_electrical_cell_models
    ),
    circuitFlagColumn(
      'hasSpines',
      'Has spines',
      'has_spines',
      'Circuits whose morphologies carry segmented dendritic spines',
      (row) => row.has_spines
    ),
    // /circuit is one of the few endpoints that sorts `subject__name`, so the catalog
    // default of non-sortable is overridden here.
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>({ sortable: true, sortField: 'subject__name' }),
    contributionsColumn<Row>({
      auxiliary: true,
      sortable: true,
      sortField: 'contribution__pref_label',
      filter: {
        // Explicit target: /circuit computes no facet bucket for this field, and a
        // target with no options renders an empty picker.
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        targets: [
          {
            id: 'prefLabel',
            label: 'Contributor',
            field: 'contribution__pref_label',
            operators: [OperatorId.Ilike, OperatorId.In],
            freeEntry: FreeEntryKind.Text,
            placeholder: 'Enter a contributor name',
          },
        ],
      },
    }),
  ],
};

/** ValueRange number column (localized display, `field__gte`/`field__lte` filter). */
function numberColumn(id: string, header: string, field: string): IColumnModel<Row> {
  return {
    id,
    header,
    align: Align.Left,
    sortable: true,
    sortField: field,
    width: { minWidth: 130 },
    getValue: (row) => localizedNumber((row as unknown as Record<string, number>)[field]),
    filter: { operators: NUMERIC_FILTER_OPERATORS, field },
  };
}

/** Reverse-lookup a dictionary's enum KEY from a stored value `key`. */
function keyByValue<T extends Record<string, { key: string }>>(
  dict: T,
  value: string | null | undefined
): keyof T {
  return (Object.keys(dict) as Array<keyof T>).find((k) => dict[k].key === value) as keyof T;
}

/** ISO → localized date, matching the legacy `renderDate` (empty when absent). */
function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export const circuitGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.Circuit,
  schema: circuitSchema,
  plugin: { Body: CircuitGridBody },
};
