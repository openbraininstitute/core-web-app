import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  subjectNameColumn,
  subjectStrainColumn,
  yesNo,
} from '../columns/catalog';
import { lifecycleStatusColumn } from '../columns/lifecycle-status';
import { ENTITY_PREVIEW_RENDERER } from '../renderers/entity-preview';
import { registerSharedRenderers } from '../renderers/register';
import { flatAdvancedFilters, recordIdFilter } from './common-filters';

import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IAdvancedFilterGroup, IColumnModel, IGridSchema } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/**
 * `IonChannelModel` omits two NMODL scalars the wire carries (`conductance_name`,
 * `max_permeability_name` — both on `IonChannelModelBaseMixin`) and models the animal
 * as top-level `species`/`strain`, whereas the list response nests it:
 * `_read_many` in `app/service/ion_channel_model.py` responds with
 * `IonChannelModelExpanded` = `IonChannelModelBaseMixin` + `ScientificArtifactRead`,
 * whose `SubjectReadMixin` supplies `subject.{name, species.name, strain.name}` —
 * eager-loaded by `_load_minimal`, which is exactly the shape the
 * `subject__strain__name` / `subject__name` filter params address.
 *
 * `contributions` needs no augmentation (already typed, and `_load_expanded`
 * eager-loads `contributions → agent`). All members optional, so `IonChannelModel`
 * stays assignable to `Row`.
 */
type Row = IonChannelModel & {
  conductance_name?: string | null;
  max_permeability_name?: string | null;
  subject?: {
    name?: string | null;
    strain?: { name?: string | null } | null;
  } | null;
};

/**
 * ADVANCED FILTERS — `GET /ion-channel-model` params with no column in this grid: the
 * record's own `id`, which has no useful column to show.
 *
 * The four NMODL-level scalars, both `subject__*` fields and
 * `contribution__pref_label` used to live here; all seven are AUXILIARY columns below
 * (hidden until ticked), so each field stays on exactly one surface.
 *
 * The `__isnull` companions of `conductance_name` / `max_permeability_name` have no
 * operator in the grid's registry and are still deliberately left out.
 */
const ionChannelModelAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'common',
    label: 'Common',
    filters: [recordIdFilter],
  },
];

/**
 * The NMODL-level scalars of `IonChannelModelBaseMixin`, as AUXILIARY columns. All
 * three are declared BARE on `IonChannelModelFilter` — no `__in`, no `__ilike` — so
 * they are offered as exact matches only, exactly as the advanced filters were.
 *
 * SORT SAFETY (`IonChannelModelFilter.Constants.ordering_model_fields`,
 * `app/filters/ion_channel_model.py`): `nmodl_suffix`, `conductance_name`,
 * `max_permeability_name`, `is_stochastic`, `subject__name` and
 * `subject__strain__name` ARE all in the allowlist — this is one of the few endpoints
 * that sorts `subject__name`. `contribution__pref_label` is NOT, so the Contributors
 * column below is the only non-sortable one of the seven.
 */
function nmodlTextColumn(
  id: string,
  header: string,
  field: string,
  placeholder: string,
  get: (row: Row) => string | null | undefined
): IColumnModel<Row> {
  return {
    id,
    header,
    auxiliary: true,
    sortable: true,
    sortField: field,
    getValue: (r) => get(r) ?? '',
    width: { minWidth: 160 },
    filter: {
      operators: [OperatorId.Eq],
      field,
      targets: [
        {
          id,
          label: header,
          field,
          operators: [OperatorId.Eq],
          freeEntry: FreeEntryKind.Text,
          placeholder,
        },
      ],
    },
  };
}

const isStochasticColumn: IColumnModel<Row> = {
  id: 'isStochastic',
  header: 'Stochastic',
  auxiliary: true,
  sortable: true,
  sortField: 'is_stochastic',
  getValue: (r) => yesNo(r.is_stochastic),
  width: { minWidth: 130 },
  filter: {
    // `is_stochastic` (bare boolean, no `__op` suffix)
    operators: [OperatorId.Bool],
    field: 'is_stochastic',
    targets: [
      {
        id: 'isStochastic',
        label: 'Stochastic',
        field: 'is_stochastic',
        operators: [OperatorId.Bool],
        description: 'Whether the channel model is stochastic',
      },
    ],
  },
};

/**
 * Ion-channel model listing (curated). Column order mirrors the legacy
 * `ViewDefForIonChannelModel`: Preview, Name, Brain region, Species, Temperature,
 * Temperature dependent, LJP corrected, Registration date. The view-def's
 * `filterableFields` (Name, BrainRegion, Species, Temperature, IsTemperatureDependent,
 * IsLjpCorrected, RegistrationDate) drive which columns carry filters.
 *
 * Per the legacy field-defs:
 *  - Species carries `subject__species__name` sort + `subject__species__name__in`
 *    facet (the ion-channel-model `perTypeConstraint`), though the value is read from
 *    the top-level `species`.
 *  - Temperature (°C) sorts on `temperature_celsius` and range-filters to
 *    `temperature_celsius__gte/__lte`.
 *  - The two boolean facets sort on / filter by their bare field name
 *    (`is_temperature_dependent`, `is_ljp_corrected`) — matching the legacy boolean
 *    constraint, which is the field itself with no `__op` suffix.
 *  - Brain region sorts on `brain_region__name`; column-level filtering is via the
 *    brain-region hierarchy selector (no facet on the column). The preview reuses the
 *    shared entity-preview thumbnail (see note in the report re: the
 *    `ion_channel_model_thumbnail` asset label the legacy renderer selected).
 */
export const ionChannelModelSchema: IGridSchema<Row> = {
  id: 'ion-channel-model',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  // flat list, no group tabs — see `flatAdvancedFilters`
  advancedFilters: flatAdvancedFilters(ionChannelModelAdvancedFilters),
  columns: [
    previewColumn<Row>({
      cellRenderer: ENTITY_PREVIEW_RENDERER,
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    nameColumn<Row>(),
    brainRegionColumn<Row>(),
    {
      id: 'species',
      header: 'Species',
      sortable: true,
      sortField: 'subject__species__name',
      getValue: (r) => r.species?.name ?? '',
      width: { minWidth: 140, flex: 1 },
      filter: {
        operators: [OperatorId.In, OperatorId.Ilike],
        field: 'subject__species__name',
        facetKey: 'species',
        description: 'Species',
        options: { kind: FilterOptionsKind.Facets },
      },
    },
    {
      id: 'temperatureCelsius',
      header: 'Temperature',
      unit: '°C',
      sortable: true,
      sortField: 'temperature_celsius',
      getValue: (r) => (r.temperature_celsius == null ? '' : `${r.temperature_celsius} °C`),
      width: { minWidth: 130 },
      filter: { operators: [OperatorId.Range], field: 'temperature_celsius' },
    },
    {
      id: 'isTemperatureDependent',
      header: 'Temperature dependent',
      sortable: true,
      sortField: 'is_temperature_dependent',
      getValue: (r) => (r.is_temperature_dependent ? 'True' : 'False'),
      width: { minWidth: 160 },
      filter: { operators: [OperatorId.Bool], field: 'is_temperature_dependent' },
    },
    {
      id: 'isLjpCorrected',
      header: 'LJP corrected',
      sortable: true,
      sortField: 'is_ljp_corrected',
      getValue: (r) => (r.is_ljp_corrected ? 'True' : 'False'),
      width: { minWidth: 140 },
      filter: { operators: [OperatorId.Bool], field: 'is_ljp_corrected' },
    },
    lifecycleStatusColumn<Row>(),
    registrationDateColumn<Row>(),
    // AUXILIARY — hidden until ticked; each replaces an advanced filter one-for-one
    nmodlTextColumn(
      'nmodlSuffix',
      'NMODL suffix',
      'nmodl_suffix',
      'Enter a full NMODL suffix',
      (r) => r.nmodl_suffix
    ),
    nmodlTextColumn(
      'conductanceName',
      'Conductance name',
      'conductance_name',
      'Enter a full conductance name',
      (r) => r.conductance_name
    ),
    nmodlTextColumn(
      'maxPermeabilityName',
      'Max permeability name',
      'max_permeability_name',
      'Enter a full permeability name',
      (r) => r.max_permeability_name
    ),
    isStochasticColumn,
    // BOTH subject fields are in IonChannelModelFilter's ordering_model_fields, so the
    // catalog's never-sortable default for `subject__name` is overridden deliberately.
    subjectStrainColumn<Row>({ sortable: true }),
    subjectNameColumn<Row>({ sortable: true, sortField: 'subject__name' }),
    // The ONLY non-sortable one: `contribution__pref_label` is absent from this
    // endpoint's ordering_model_fields, and an order_by outside it is a hard 422.
    contributionsColumn<Row>({
      auxiliary: true,
      sortable: false,
      filter: {
        // `contribution__pref_label__ilike`, `contribution__pref_label__in`
        operators: [OperatorId.Ilike, OperatorId.In],
        field: 'contribution__pref_label',
        // explicit target: this endpoint's facet keys are brain_region / subject /
        // subject.species / subject.strain — no `contribution` bucket, so the
        // synthesised "no options ⇒ use facets" target would be an empty picker
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

export const ionChannelModelGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.IonChannelModel,
  schema: ionChannelModelSchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
  },
};
