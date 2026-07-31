# Filters — one model, two surfaces

A grid filter is always the same thing: a **target** (which backend field), an
**operator** (how to match), and a **value**. That triple is edited by one component,
stored in one record, and serialized by one strategy table. What differs between the
two filter surfaces is only *where the editor is opened from*.

| | per-column filter | advanced filter |
| --- | --- | --- |
| declared on | `IColumnModel.filter` (`IColumnFilter.targets`) | `IGridSchema.advancedFilters` |
| surfaced by | the funnel button in the column header (`renderers/aggrid/header.tsx`) | the toolbar filter button → menubar (`react/active-filters.tsx` → `react/advanced-filters.tsx`) |
| requires a column | yes | **no** — that is the whole point |
| multiple targets | yes (renders a "match by" switch) | no (a group's filter is exactly one target) |
| state key | the column id | `adv:<groupId>:<filterId>` |

Everything else is shared:

- **one vocabulary** — an advanced filter *is* an `IFilterTarget`
  (`TAdvancedFilterDef = IFilterTarget` in `core/domain/advanced-filters.ts`). There is
  deliberately no parallel type hierarchy.
- **one editor** — `react/filters/filter-editor.tsx`. It is told a `filterKey` and a
  list of targets and never learns which surface opened it.
- **one operator registry** — `core/operators/default-operators.ts`.
- **one state store** — `GridState.filters` (`TFilterModel = Record<string, IFilterEntry>`).
- **one serializer** — `bindings/entitycore/query-serializer.ts`.

Add a filter to a column when the user can see the values in a cell. Add an advanced
filter when the endpoint accepts a param the grid shows no column for
(`GET /cell-morphology` accepts the whole `cell_morphology_protocol__*` family).

## The shared vocabulary: `IFilterTarget`

Defined in `core/domain/column-model.ts`. Every key means the same thing on both
surfaces:

| key | meaning |
| --- | --- |
| `id` | stable id, persisted on the entry as `targetId`; part of the advanced-filter state key |
| `label` | sentence-case name shown in the menu / the "match by" switch |
| `field` | the backend field the serializer builds the param from |
| `operators` | ordered operator ids valid for this target; **index 0 is the default** |
| `options` | where a set/enum picker gets its choices: `{kind:'facets'}`, `{kind:'static', items}`, `{kind:'async', load}` |
| `facetKey` | bucket key in the response's `facets` map when it differs from `field` (facets only); defaults to `field` |
| `description` | short help line under the filter's title |
| `placeholder` | overrides the placeholder derived from the active operator (`react/filters/placeholder.ts`) |
| `freeEntry` | for a **set target with no `options`**: `'uuid'` (default) or `'text'` — what the paste-a-list editor accepts and validates |
| `available` | contextual gate (see `bindings/entitycore/schemas/CONTEXTUAL.md`) |

Two behaviours worth internalising:

- a set target **without** `options` is a free-entry (paste-a-list) box, not a picker.
  Its `freeEntry` kind defaults to `'uuid'`, so a target that collects names, acronyms
  or URLs **must** say `freeEntry: FreeEntryKind.Text` or every token is flagged
  invalid and Apply stays disabled (`core/domain/filter-targets.ts#freeEntryKind`).
- for **facet** options the value sent to the API is the bucket's *label*, not its id
  (`react/filters/use-set-options.ts`); for static/async options it is the item's `id`.

## State keys, and why `adv:` cannot collide

Advanced filters live in the same `filters` record as column filters so persistence,
reset, the active-filters list and serialization need no special case. To keep them
from colliding with a column id, the key is namespaced:

```ts
// core/domain/advanced-filters.ts
export const ADVANCED_FILTER_KEY_PREFIX = 'adv:';
export const advancedFilterKey = (groupId, filterId) => `adv:${groupId}:${filterId}`;
```

A column id can never take that shape: ids are used verbatim as AG Grid column ids and
as the backend field fallback (`filter.field ?? column.field ?? column.id`), and a `:`
has never been legal in either. So `isAdvancedFilterKey(key)` is an exact test in both
directions, and the group id keeps two groups from clashing on the same filter id.

## Adding an advanced filter group

Everything happens in the entity's schema under
`bindings/entitycore/schemas/`. Declare the groups, then hang them on the schema:

```ts
import { FilterOptionsKind, FreeEntryKind, OperatorId } from '../../../core';

import type { IAdvancedFilterGroup, IGridSchema } from '../../../core';

/**
 * ADVANCED FILTERS — `GET /cell-morphology` params with no column in this grid.
 * Every field/operator pair below was checked against the live OpenAPI spec; the
 * emitted param is named in each comment. Nothing here is inferred from a convention.
 */
const cellMorphologyAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'protocol', //            part of the state key — never rename casually
    label: 'Protocol', //         menubar tab
    description: 'How each morphology was produced.', // optional, above the list
    // available: byContext({ ... }),  // optional contextual gate
    filters: [
      {
        id: 'protocolDesign',
        label: 'Protocol design',
        field: 'cell_morphology_protocol__protocol_design',
        // `…__in`, `…__not_in`, `…` (exact)
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: {
          kind: FilterOptionsKind.Static,
          items: [
            { id: 'experimental', label: 'Experimental' },
            { id: 'computational', label: 'Computational' },
          ],
        },
        description: 'Experimental or computational design of the protocol',
      },
      {
        id: 'protocolName',
        label: 'Protocol name',
        field: 'cell_morphology_protocol__name',
        // `…__ilike`, `…__in`, `…` (exact)
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        // no `options` ⇒ paste-a-list editor; these are names, not UUIDs
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter part of a protocol name, like Patch-clamp',
      },
      {
        id: 'protocolId',
        label: 'Protocol ID',
        field: 'cell_morphology_protocol__id',
        // `…__id__in`. The scalar `…__id` adds nothing over a one-element list.
        operators: [OperatorId.In], // free-entry UUIDs (the default kind)
      },
    ],
  },
];

export const cellMorphologySchema: IGridSchema<ICellMorphology> = {
  id: 'cell-morphology',
  // …
  advancedFilters: cellMorphologyAdvancedFilters,
  columns: [/* … */],
};
```

That is the whole integration. The toolbar button renders itself as soon as
`schema.advancedFilters` is non-empty (`react/data-grid.tsx`), the menubar builds
itself from `resolveAdvancedFilterGroups(schema, ctx)`, and the entry serializes
through the same strategy table as any column filter.

`facetKey` has no use here yet — no advanced filter sources facet options today. It
matters on columns whose bucket key differs from the filtered field, e.g. options
returned under `mtype` but filtered as `mtype__pref_label__in`:

```ts
{ id: 'name', label: 'Name', field: 'mtype__pref_label', facetKey: 'mtype',
  operators: [OperatorId.In, OperatorId.Ilike],
  options: { kind: FilterOptionsKind.Facets } }
```

## Operator → wire param

The single place that knows entitycore's `field__op` convention is the `STRATEGIES`
table in `bindings/entitycore/query-serializer.ts`. Adding an operator = add a
strategy there **and** declare it on a target.

| operator | value kind | emitted param |
| --- | --- | --- |
| `OperatorId.In` | set | `field__in: string[]` |
| `OperatorId.InSingleUnderscore` | set | `field_in: string[]` (a handful of backend relation filters are spelled this way) |
| `OperatorId.NotIn` | set | `field__not_in: string[]` |
| `OperatorId.Ilike` | text | `field__ilike: '%term%'` — `%` and `_` escaped by `toContainsPattern` |
| `OperatorId.Contains` | text | `field__contains: term` |
| `OperatorId.Eq` | text | `field: term` (**bare**, no suffix) |
| `OperatorId.Bool` | boolean | `field: true \| false` (bare) |
| `OperatorId.Gte` / `Lte` | number | `field__gte` / `field__lte` |
| `OperatorId.Range` | range | `field__gte` and/or `field__lte` (only the bounds that are set) |
| `OperatorId.DateRange` | dateRange | `field__gte` / `field__lte`, ISO strings |

An empty value emits **nothing** — every strategy returns `{}` rather than a param
with an empty argument. Sort is separate: `order_by: ['+field', '-field']`, built from
`sortField ?? field ?? id`.

## Verify the param exists before exposing it

> The backend silently ignores unknown query params. A misspelled or invented field
> does not error — it just returns unfiltered results, and the bug reads as "the
> filter does nothing".

Two oracles, both authoritative, checked **before** writing the target:

1. **The live OpenAPI spec.** For the staging deployment named in `ENTITY_CORE_URL`,
   read `paths['/<endpoint>'].get.parameters` and keep only entries with
   `in == 'query'`. The param you intend to emit (`field__in`, `field__ilike`, the bare
   `field`, …) must appear there verbatim.
2. **The entitycore source**, `app/filters/*.py`. Each endpoint's filter class composes
   mixins, and the mixins are where the suffixes come from — e.g. `NameFilterMixin`
   contributes `name`, `name__in`, `name__ilike`; `IdFilterMixin` contributes `id` and
   `id__in`. Nested filters are prefixed with `with_prefix(...)`, which is why the
   cell-morphology protocol params read `cell_morphology_protocol__*`. If a suffix is
   not declared on the class (or inherited from a mixin), it does not exist.

Never infer a param from a naming convention: `protocol_design` has `__not_in` while
`lifecycle_status` has no list form at all, and both live on the same endpoint.

**Sorting has the opposite failure mode.** `order_by` is validated against
`Constants.ordering_model_fields` on the endpoint's filter class (`app/filters/base.py`
raises on anything else), so an unlisted sort field is a hard **422**, not a silent
no-op. Mark a column `sortable` only when its resolved `sortField` is in that list.

Both oracles are recorded in the test suite: see
`src/__tests__/data-grid/bindings/entitycore/advanced-filters-serialization.test.ts`,
whose header states the spec query it was written from, and the `*-parity.test.ts`
files that pin sortability to `ordering_model_fields`.

## Pitfall: never expose a filter the host already pins

Host params win. Two merges make sure of it:

```ts
// query-serializer.ts — host params spread AFTER the user's filters
const params = { page, page_size, ...serializeFilters(...), ...(query.params ?? {}) };

// entity-configuration/domain/experimental/cell-morphology.ts
function narrowFilters(filters) {
  return { ...filters, ...cellMorphologyGenerationTypeFilter };
}
```

The cell-morphology listing pins
`cell_morphology_protocol__generation_type__not_in: [computationally_synthesized,
modified_reconstruction, placeholder]` in the entity's domain config, and
`narrowFilters` spreads it *after* whatever the grid produced. So exposing a
`NotIn` operator on `cell_morphology_protocol__generation_type` would let the user
build a filter that is then silently overwritten — the UI would show an applied
filter that has no effect.

That is why the real schema offers only `In` and `Eq` on that field, with the reason
written next to it: `__in` composes correctly with the host's `__not_in`
(intersection), `__not_in` would collide on the same param name. **Before exposing an
advanced filter, grep the entity's domain config in `src/entity-configuration/domain/`
for the field.** If the listing already pins it, either omit the filter or offer only
operators whose param name differs from the pinned one.

## Orphans: what happens when a schema changes

Persisted state outlives schema edits. Session storage keeps `filters` (plus sort,
page, quick filter) under `data-grid:v1:*`, so a user can still hold an
`adv:protocol:someRemovedFilter` entry after the group is renamed or the filter
deleted. Left alone it would fall through the serializer's column lookup and be
emitted as a query param literally named `adv:protocol:someRemovedFilter__in`.

`pruneAdvancedFilters(filters, schema)` prevents that. On hydration the controller
runs it right after `hydrateFilterTargetIds` (`core/grid-controller.ts`, only when the
grid was constructed with an `instanceKey` and persistence adapters), and it:

- **drops** any `adv:` entry with no definition in the current schema;
- **re-pins** the surviving entries' `targetId` to their def's `id`;
- returns the *same reference* when nothing needed fixing, so no needless re-render.

Column entries are untouched by it — those are repaired by `hydrateFilterTargetIds`,
which defaults a missing or stale `targetId` to the column's first target.

There is a second, independent guard in the serializer: `filterField()` returns `''`
for an unknown `adv:` key and `serializeFilters` skips empty fields, so even an
un-pruned orphan (a grid without persistence, a programmatically set entry) can never
reach the wire.

## Where things live

| concern | file |
| --- | --- |
| target/filter types | `core/domain/column-model.ts` |
| target resolution, free-entry kind, legacy single-target synthesis | `core/domain/filter-targets.ts` |
| advanced-filter types, key namespacing, group resolution, pruning | `core/domain/advanced-filters.ts` |
| filter values, summaries, emptiness | `core/domain/filter-model.ts` |
| operator catalog and UI kinds | `core/operators/` |
| the editor (both surfaces) | `react/filters/filter-editor.tsx` |
| advanced-filter menubar | `react/advanced-filters.tsx` |
| toolbar button + applied list | `react/active-filters.tsx` |
| column header popover | `renderers/aggrid/header.tsx` |
| operator → entitycore param | `bindings/entitycore/query-serializer.ts` |
| per-entity declarations | `bindings/entitycore/schemas/` |

Tests live under `src/__tests__/data-grid/`; the serialization and parity suites are
the ones that fail loudest when a param or a sort field is wrong.
