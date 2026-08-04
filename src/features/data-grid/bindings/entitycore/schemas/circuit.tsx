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
import { CircuitGridBody } from '@/features/data-grid/host/circuit-grid-body';
import {
  CIRCUIT_VIEW_FACTOR,
  CircuitRepresentationView,
  countDeepSubCircuits,
} from '@/ui/segments/explore/circuit/helpers';

import { Align, byContext, FilterOptionsKind, FreeEntryKind, OperatorId } from '../../../core';
import {
  contributionsColumn,
  descriptionColumn,
  nameColumn,
  speciesColumn,
  subjectNameColumn,
  subjectStrainColumn,
  yesNo,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { buildCircuitAdvancedFilters } from './circuit-models';
import { flatAdvancedFilters, staticOptions } from './common-filters';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ICircuitEnriched } from '@/ui/segments/explore/circuit/helpers';
import type { IColumnModel, IGridSchema } from '../../../core';
import type { IHasContributions } from '../columns/catalog';
import type { IEntityGridDefinition } from '../registry';

/**
 * `ICircuit` declares only ONE of the four `has_*` content flags
 * (`has_electrical_cell_models`) and omits `contributions` altogether, but the wire
 * carries all five: `CircuitRead` = `CircuitBaseMixin` (all four booleans, non-null,
 * default `false`) + `ScientificArtifactRead` → `EntityRead` →
 * `ContributionReadWithoutEntityMixin`, and the list loader eager-loads
 * `Circuit.contributions → Contribution.agent` (`app/service/circuit.py`).
 *
 * Every augmented member is OPTIONAL on purpose: that keeps `ICircuit` assignable to
 * `Row`, so `IGridSchema<Row>` stays interchangeable with `IGridSchema<ICircuit>` for
 * the nested `CircuitRecursiveGrid` and `RELATED_CIRCUIT_COLUMNS` consumers. Same
 * local-augmentation pattern as `schemas/cell-morphology.ts`.
 *
 * (`subject` IS declared on `ICircuit`, and `ISubject` carries `name` and
 * `strain.name`, so the two subject columns need no augmentation.)
 */
type Row = ICircuit &
  IHasContributions & {
    has_morphologies?: boolean | null;
    has_point_neurons?: boolean | null;
    has_spines?: boolean | null;
  };

/**
 * ADVANCED FILTERS — `GET /circuit` params with no column in this grid. The whole
 * circuit family shares one declaration ({@link buildCircuitAdvancedFilters}); this
 * listing is the one that shows Build category and Target simulator COLUMNS, so both
 * are excluded here.
 *
 * The four `has_*` flags, both `subject__*` fields and `contribution__pref_label` are
 * excluded too — they are AUXILIARY COLUMNS below (hidden until ticked), which keeps
 * each field on exactly one surface. The panel still offers them for as long as they
 * stay hidden. What is left is the record's own `id` and the two provenance UUIDs,
 * none of which has a useful column to show.
 *
 * `scale` is deliberately absent too: the base circuit listing narrows `scale__in` in
 * its domain config (`narrowFilters`, everything except Single) and the Scale column
 * already owns that param.
 */
const circuitAdvancedFilters = buildCircuitAdvancedFilters({
  includeBuildCategory: false,
  includeTargetSimulator: false,
  includeContents: false,
  includeSubject: false,
  includeContribution: false,
});

/**
 * The four `has_*` content flags of `CircuitFilterMixin`'s host, as AUXILIARY columns.
 *
 * SORT SAFETY: all four ARE in `CircuitFilter.Constants.ordering_model_fields`
 * (`app/filters/circuit.py`), so every one of them sorts — this listing has no sort
 * offender among the fields moved off the panel.
 *
 * The filter is declared as an explicit TARGET rather than flat props: the synthesised
 * legacy target reads "no options" as "use the grid's facets", which for a boolean the
 * server computes no bucket for is an empty picker instead of the Yes/No control.
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
      // the bare boolean param — `has_morphologies=true`, no `__op` suffix
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
 * Re-authored circuit grid schema. Column ids equal the legacy antd column keys
 * (the {@link EntityCoreFields} values) so the top-level controller's hidden-column
 * set maps 1:1 onto the nested `CircuitRecursiveGrid`'s antd columns (see
 * {@link CircuitGridBody}). Column order mirrors the legacy `ViewDefForCircuit`
 * (minus the antd-only Download action column, replaced by the shared selection +
 * bulk download). Per-column server filters/sorts are locked to the legacy
 * `transformFiltersToQuery` oracle by the circuit parity test.
 */
export const circuitSchema: IGridSchema<Row> = {
  id: 'circuit',
  getRowId: (row) => row.id,
  // NO selection: the circuit listing has no checkboxes and no bulk-action selection
  // (parity with the legacy antd listing, whose per-row Download action column stood
  // in for them). Selection is opt-in, so omitting the spec IS the opt-out. The
  // workflow PICKERS are unaffected: a picker supplies its own `selectionType` /
  // `onRowsSelected` through `mainTableProps`, which `<DataGrid>` honours
  // independently of the schema (see `pickerMode` in `react/data-grid.tsx`).
  // Sorting is off in the HIERARCHY view: rows there are a derivation tree whose
  // order is structural, and the view-aware data source ignores `order_by`, so a
  // sortable header would be a control that does nothing. The legacy listing did the
  // same by withholding `sortState`/`setSortState` from `useDataTableColumns`. Flat
  // view keeps every column's declared `sortable` untouched.
  sortable: byContext<boolean>({
    default: true,
    rules: [
      {
        when: { [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Hierarchy },
        value: false,
      },
    ],
  }),
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(circuitAdvancedFilters),
  // Detail rows host the recursive subcircuit grid (hierarchy view). The runtime is
  // supplied by the plugin body (`detailOverride`); this only sizes the detail row.
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
    // Hosts the expand chevron (right-aligned), and only ever means something in the
    // Data → Circuit HIERARCHY listing: the count describes a subtree the flat listing
    // does not render, and the expander only exists when the plugin supplies its
    // recursive detail. So availability is contextual and DENY-BY-DEFAULT — it turns on
    // only for the Data section AND the circuit plugin's hierarchy view (published as
    // the `CIRCUIT_VIEW_FACTOR` grid-context factor by `CircuitGridBody`). Every other
    // mount of this schema (workflow/extract pickers, any non-Data surface) never sets
    // that factor, so the column resolves away. NB: `resolveColumns` is what applies
    // this, so `circuitSchema.columns` still carries the column for the NESTED
    // `CircuitRecursiveGrid` and `RELATED_CIRCUIT_COLUMNS`, which need the expander.
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
      // Pinned: this column HOSTS the expand chevron, so its position is part of how
      // the tree reads — dragging it elsewhere leaves the chevron detached from the
      // hierarchy it opens.
      movable: false,
      width: { width: 110, minWidth: 90 },
      getValue: (row) => {
        const enriched = row as ICircuitEnriched;
        return 'sub_circuits' in row ? countDeepSubCircuits(enriched) || '' : '';
      },
    } satisfies IColumnModel<Row>,
    descriptionColumn<Row>({ id: EntityCoreFields.Description }),
    // ICircuit's type omits `brain_region` (present on the wire); read it via a cast —
    // same shape/filter binding as the catalog `brainRegionColumn`. The hierarchy
    // selector's `within_brain_region_*` gating still applies on top.
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
        // options mirror the legacy dropdown (all scales except "Single").
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
      // Static enum filter (backend exposes a plain enum, not a facet). Not sortable.
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
      // /circuit exposes `published_in` + `published_in__ilike` (no `__in`).
      filter: { operators: [OperatorId.Ilike], field: 'published_in' },
    } satisfies IColumnModel<Row>,
    {
      id: EntityCoreFields.ArtifactExperimentDate,
      header: 'Experiment date',
      align: Align.Left,
      // `experiment_date` is in CircuitFilter's ordering fields, and /circuit exposes
      // `experiment_date__gte` / `experiment_date__lte`.
      sortable: true,
      sortField: 'experiment_date',
      width: { minWidth: 140 },
      getValue: (row) => formatDate(row.experiment_date),
      filter: { operators: [OperatorId.DateRange], field: 'experiment_date' },
    } satisfies IColumnModel<Row>,
    // Visible, matching the legacy view-def (PR #1850 appends it after Experiment date).
    lifecycleStatusColumn<Row>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one.
    // ZERO SORT OFFENDERS here: every field below is in
    // `CircuitFilter.Constants.ordering_model_fields`, which SPREADS
    // `ScientificArtifactFilter.Constants.ordering_model_fields` and adds the four
    // `has_*` flags, `subject__name`, `subject__strain__name` and
    // `contribution__pref_label` explicitly (`app/filters/circuit.py`).
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
    // Both subject fields ARE in CircuitFilter's ordering fields — `subject__name` is
    // one of the few endpoints that sorts it, so the catalog default (never sortable)
    // is overridden deliberately here.
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>({ sortable: true, sortField: 'subject__name' }),
    // No circuit listing shows Contributors as a regular column; auxiliary keeps the
    // field on one surface without changing the default layout. `contribution__pref_label`
    // IS in CircuitFilter's ordering fields.
    contributionsColumn<Row>({
      auxiliary: true,
      sortable: true,
      sortField: 'contribution__pref_label',
      filter: {
        // `contribution__pref_label__ilike`, `contribution__pref_label__in` — the
        // operators (and free-entry kind) of the advanced filter this replaces. An
        // explicit target because the field has no server-computed facet bucket on
        // /circuit, and a target with no options would render an empty picker.
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
    align: Align.Right,
    sortable: true,
    sortField: field,
    width: { minWidth: 130 },
    getValue: (row) => localizedNumber((row as unknown as Record<string, number>)[field]),
    filter: { operators: [OperatorId.Range], field },
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
