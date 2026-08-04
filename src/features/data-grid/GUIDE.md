# Developer guide — how do I…

Task-oriented recipes for `src/features/data-grid`. Start here; the two companion
docs go deeper on one axis each:

| doc | answers |
| --- | --- |
| **this file** | add a table, add a column, add a filter, gate either by context, and the traps that cost a day |
| [`FILTERS.md`](./FILTERS.md) | the filter MODEL — targets, operators, the `adv:` namespace, operator → wire param, how to verify a param exists |
| [`bindings/entitycore/schemas/CONTEXTUAL.md`](./bindings/entitycore/schemas/CONTEXTUAL.md) | the contextual RULE ENGINE — `byContext`, `when` semantics, composition, where rules are resolved |

Nothing here repeats those; each recipe links out at the point it would.

## The five-minute mental model

Rings, innermost first — **core → react → renderers → bindings → host**. A ring may
import from rings to its left, never to its right.

| ring | what lives there |
| --- | --- |
| `core/` | pure domain: schema/column/filter types, contextual resolver, controller, state store. No React, no AG Grid. |
| `react/` | headless React: `DataGrid`, toolbar, column chooser, filter editors, persistence. |
| `renderers/aggrid/` | the AG Grid adapter (header popover, cell wrappers, theme). |
| `bindings/entitycore/` | the per-entity declarations: column catalog, schemas, query serializer, **registry**. |
| `host/` | workspace integration: `BrowseEntityGrid` / `EntityDataGrid`, plugin bodies. |

An entity listing is authored as data: an `IGridSchema` (`core/domain/schema.ts`)
paired with a `dataType` in an `IEntityGridDefinition` (`bindings/entitycore/registry.ts`).
The host builds an `IGridContext`, `resolveColumns` resolves the schema against it,
and the serializer turns the resulting state into entitycore query params.

---

## 1. Add a new entity table

### 1.1 Author the schema

Create `bindings/entitycore/schemas/<entity>.ts`. The minimum that produces a working
listing is `id`, `getRowId` and `columns`:

```ts
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { OperatorId, SortDirection } from '../../../core';
import { brainRegionColumn, nameColumn, registrationDateColumn } from '../columns/catalog';
import { flatAdvancedFilters } from './common-filters';

import type { IGridSchema } from '../../../core';
import type { IEntityGridDefinition } from '../registry';

export const myEntitySchema: IGridSchema<Row> = {
  id: 'my-entity',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 56,
  selection: { enabled: true },
  advancedFilters: flatAdvancedFilters(myEntityAdvancedFilters),
  columns: [
    nameColumn<Row>({ essential: true }),
    brainRegionColumn<Row>(),
    registrationDateColumn<Row>(),
  ],
};

export const myEntityGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.MyEntity,
  schema: myEntitySchema,
};
```

Notes that are not obvious:

- **Do NOT restate the query layer.** Endpoint, `narrowFilters`, search mode and
  facets come from the entity's domain config (`src/entity-configuration/domain/**`),
  keyed by `dataType`. `IEntityGridDefinition` deliberately carries no `api` block —
  one source of truth (see the doc comment on the interface).
- **Prefer the catalog** (`bindings/entitycore/columns/catalog.ts`) over hand-rolled
  columns. Every factory is structurally typed to the minimal row shape it reads and
  takes a `TColumnOverride`, deep-merged by `mergeColumnDef` (`core/domain/merge-column.ts`):
  `width`, `filter` and `cellRendererParams` merge rather than clobber, and the
  contextual facets compose.
- If the hand-written entity type omits fields the wire actually returns, augment
  locally with a `type Row = IMyEntity & IHasSpecies & { … }` — see
  `schemas/ion-channel-recording.ts` for the pattern *and* for how to document the
  difference between "TS omits it" and "the server does not send it".
- Custom cell renderers: add `registerCellRenderers` to the definition and register
  keys into the shared registry (`schemas/cell-morphology.ts` does exactly this for
  `cellMorphologyPreview`).

### 1.2 Register it — what the flip actually does

Add one import and one entry in `bindings/entitycore/registry.ts`:

```ts
import { myEntityGridDefinition } from './schemas/my-entity';

const definitions: Record<string, TAnyEntityGridDefinition> = {
  // …
  [myEntityGridDefinition.dataType]: myEntityGridDefinition,
};
```

That entry **is** the per-entity migration switch. `src/features/views/listing/browse-entity.tsx`:

```ts
const definition = getEntityGridDefinition(props.dataType);
if (definition) return <BrowseEntityGrid {...props} definition={definition} />;
return <BrowseEntityScopeLegacy {...props} />;
```

Registered ⇒ the AG Grid listing. Absent ⇒ the untouched legacy antd table. **Rollback
is deleting the line** — that is why the registry keeps rollback comments next to the
circuit spreads. The same lookup is used by `src/ui/segments/explore/circuit/index.tsx`.

Then extend `src/__tests__/data-grid/bindings/entitycore/registry-coverage.test.ts`.
Its lists mirror the real call sites (the data-browse route's `AllowedEntities`, the
notebooks route, and every workflow/picker `sourceType`), so an entity that can reach
`BrowseEntityScope` without a schema fails the build instead of silently falling back
to antd.

### 1.3 Write the parity test

A parity test (`*-parity.test.ts`) is the flip's safety net. It pins two invariants
against the **legacy** implementation, which is still in the tree and is the oracle:

1. **Presentation** — the non-auxiliary column ids, in order, equal the legacy
   view-def's columns (`src/entity-configuration/definitions/view-defs/**`).
2. **Request params** — `serializeQuery(query, schema)` equals the legacy
   `transformFiltersToQuery` output for representative filter/sort/page states.

Copy `src/__tests__/data-grid/bindings/entitycore/cell-morphology-parity.test.ts` and
substitute. Auxiliary columns are excluded from the column comparison on purpose: an
auxiliary column adds a filter surface, never a column the legacy listing lacked.

### 1.4 Custom behaviour: the plugin escape hatch

If the listing needs behaviour the shared template does not have, do NOT add entity
knowledge to `host/browse-entity-grid.tsx`. Supply `plugin: { Body }` on the
definition; the body renders `EntityDataGrid` with strategy overrides
(`IEntityDataGridOverrides`): `dataSourceOverride`, `extraParams`, `extraToolbarSlots`,
`getRowClass`, `detailOverride`, `expandColumn`, `extraEnabled`, `extraFactors`.
`host/circuit-grid-body.tsx` is the worked example.

---

## 2. Add a column

All three visibility flags live on `IColumnModel` (`core/domain/column-model.ts`).

### 2.1 Visible by default

```ts
{
  id: EntityCoreFields.CircuitScale,
  header: 'Scale',
  align: Align.Left,
  sortable: true,
  sortField: 'scale',
  width: { width: 120, minWidth: 100 },
  getValue: (row) => CircuitScale[keyByValue(CircuitScale, row.scale)]?.label ?? '',
  filter: { operators: [OperatorId.In], field: 'scale', options: staticOptions(CircuitScale) },
} satisfies IColumnModel<ICircuit>
```

- `id` is the state key (sort, filters, persisted layout, AG Grid column id). Renaming
  it invalidates every user's saved layout for that column — treat it as a migration.
- `field` defaults to `id`; `sortField` defaults to `field ?? id`. Read §5.2 before
  setting `sortable: true`.
- `getValue` feeds sorting fallback, the quick filter and export. `cellRenderer` is a
  **string key** resolved by the React ring's registry — the core ring never imports React.

### 2.2 `auxiliary: true` — hidden until ticked

An auxiliary column is a backend-filterable field the grid *can* show but does not
until the user ticks it in the chooser, below the hairline that closes the regular
columns:

```ts
const protocolDesignColumn: IColumnModel<Row> = {
  id: 'protocolDesign',
  header: 'Protocol design',
  auxiliary: true,
  sortable: false, // not in ordering_model_fields
  getValue: (r) => PROTOCOL_DESIGN_LABELS.get(r.cell_morphology_protocol?.protocol_design ?? '') ?? '',
  width: { minWidth: 160 },
  filter: { /* … */ },
};
```

`auxiliary` is **not contextual** — it is a statement about the schema's shape, not
about one surface. It implies `hiddenByDefault: true`, and it is what puts the
column's filter in the toolbar panel while hidden (§3.3).

### 2.3 `essential: true` — survives a bulk deselect

```ts
nameColumn<Row>({ essential: true })
```

`essential` binds **one action**: the chooser's "Select all" checkbox, when unticked,
collapses to `essentialColumnIds(columns)` instead of hiding everything
(`react/column-chooser.tsx`). The user can still hide an essential column via its own
checkbox — conservative in one click, unrestricted deliberately. When a schema marks
nothing, `essentialColumnIds` falls back to the first non-auxiliary column, so every
grid is safe without annotating all of them.

### 2.4 How the three interact

| flag | contextual? | effect |
| --- | --- | --- |
| `hiddenByDefault` | yes | starts hidden, offered by the chooser, user can show it |
| `auxiliary` | **no** | implies `hiddenByDefault: true`, sorts below the chooser separator, contributes its filter to the panel while hidden |
| `essential` | no | exempt from the chooser's bulk deselect only |

`resolveColumns` (`core/domain/resolve-schema.ts`) computes the effective default:

```ts
hiddenByDefaultResolved: resolveContextual(column.hiddenByDefault ?? column.auxiliary ?? false, ctx)
```

So an explicit `hiddenByDefault` **always wins** over `auxiliary` — that is the escape
hatch (an auxiliary column that must start visible somewhere), not the normal way to
hide one. Leave `hiddenByDefault` undefined on auxiliary columns unless you mean it.

`essential` is orthogonal to both: it says nothing about the default state, only about
what the bulk action keeps.

---

## 3. Add a filter

Read [`FILTERS.md`](./FILTERS.md) for the model. This section is only the decision.

### 3.1 The rule

> Every backend-filterable field is represented **exactly once** — as a column
> (visible or auxiliary) OR as an entry in `schema.advancedFilters`. Never both.
> **ID-type fields (`id`, `*__id`) stay advanced filters**: there is no useful column
> to show for a UUID.

### 3.2 Column filter with `targets`

`targets` is the "match by …" axis: one column, several backend fields, one segmented
switch in the popover. Every declared target is offered — there is no per-target opt-in.

```ts
brainRegionColumn<Row>({
  filter: {
    targets: [
      { id: 'name', label: 'Name', field: 'brain_region__name',
        operators: [OperatorId.In, OperatorId.Ilike],
        facetKey: 'brain_region', options: { kind: FilterOptionsKind.Facets } },
      { id: 'id', label: 'ID', field: 'brain_region__id', operators: [OperatorId.In] },
      { id: 'acronym', label: 'Acronym', field: 'brain_region__acronym',
        operators: [OperatorId.In],
        // acronyms are not UUIDs — without this every token is flagged invalid
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Paste one or more acronyms, like SSp-bfd' },
    ],
  },
})
```

A set target with **no** `options` is a paste-a-list box whose `freeEntry` defaults to
`'uuid'`. Anything that collects names, acronyms or URLs must say
`freeEntry: FreeEntryKind.Text`.

### 3.3 Advanced filter (no column)

An entry in `schema.advancedFilters` is an ordinary `IFilterTarget` with no column
behind it. Full walkthrough in FILTERS.md § *Adding an advanced filter group*; the
short form:

```ts
const myEntityAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  { id: 'common', label: 'Common',
    filters: [{ id: 'id', label: 'ID', field: 'id', operators: [OperatorId.In, OperatorId.Eq] }] },
];
// …
advancedFilters: flatAdvancedFilters(myEntityAdvancedFilters),
```

`flatAdvancedFilters` (`schemas/common-filters.ts`) collapses groups into one so the
popover shows a flat list instead of a one-per-group tab bar. Every entitycore listing
currently opts in.

### 3.4 The panel is DERIVED — you do not declare it

```
panel = schema.advancedFilters + auxiliary columns currently hidden
```

`resolveFilterPanelGroups` (`core/domain/filter-panel.ts`) is the only place that
derivation lives. Consequences worth internalising:

- Ticking an auxiliary column **removes** its filter from the toolbar panel — the
  column header owns it now. Unticking puts it back. You write nothing for this.
- The move is purely presentational: both surfaces key the entry by the **column id**
  (advanced filters use the disjoint `adv:` namespace), so an applied filter keeps its
  key, its `targetId` and its value across the toggle, and is never serialized twice.
- Moving a filter from the panel onto a column is therefore just: delete the
  `advancedFilters` entry, add an `auxiliary: true` column carrying the same
  `field`/`operators`/`freeEntry`. `schemas/cell-morphology.ts` is seven of these.

---

## 4. Make a column or filter contextual

The rule engine is documented in
[`CONTEXTUAL.md`](./bindings/entitycore/schemas/CONTEXTUAL.md). This is the decision
and the wiring.

### 4.1 The context

```ts
// core/domain/grid-context.ts
export interface IGridContext {
  dataType: string;
  section?: string;   // WorkspaceSection — Data, Explore, Build, …
  scope?: string;     // workspace scope (project / …)
  species?: string;   // 'all' or a hierarchy id
  factors?: Readonly<Record<string, string | number | boolean>>; // open bag
}
```

The host builds it in `host/browse-entity-grid.tsx`:

```ts
context: { dataType, section, scope, species: speciesKey, factors: extraFactors }
```

`extraFactors` is an `IEntityDataGridOverrides` prop, so a **plugin body** can publish
a dimension only it knows about, with zero core changes. Memoise it — a new object
identity rebuilds the controller.

### 4.2 The real example: the circuit Subcircuits column

`schemas/circuit.tsx` gates the expander-hosting column to the Data section AND the
circuit plugin's hierarchy view, deny-by-default:

```ts
{
  id: EntityCoreFields.CircuitSubCircuit,
  header: 'Subcircuits',
  available: byContext<boolean>({
    default: false,
    rules: [
      { when: {
          section: WorkspaceSection.Data,
          [CIRCUIT_VIEW_FACTOR]: CircuitRepresentationView.Hierarchy,
        },
        value: true },
    ],
  }),
  align: Align.Left,
  width: { width: 110, minWidth: 90 },
  getValue: (row) => ('sub_circuits' in row ? countDeepSubCircuits(row as ICircuitEnriched) || '' : ''),
}
```

and `host/circuit-grid-body.tsx` publishes the factor:

```ts
const gridFactors = useMemo(() => ({ [CIRCUIT_VIEW_FACTOR]: view }), [view]);
// …
<EntityDataGrid {...props} extraFactors={gridFactors} … />
```

Only this plugin supplies `CIRCUIT_VIEW_FACTOR`, so every other mount of
`circuitSchema` (workflow/extract pickers, any non-Data surface) resolves the rule to
its `false` default and the column vanishes. Note the deliberate asymmetry:
`resolveColumns` is what drops it, so `circuitSchema.columns` still *carries* the
column for the nested `CircuitRecursiveGrid` and `RELATED_CIRCUIT_COLUMNS`, which need
the expander. Pinned by
`src/__tests__/data-grid/bindings/entitycore/circuit-subcircuits-column.test.ts`.

### 4.3 `available` vs `hiddenByDefault` — make the choice explicitly

| | `available: false` | `hiddenByDefault: true` |
| --- | --- | --- |
| the column | dropped entirely by `resolveColumns` | present, unticked in the chooser |
| its filter | **gone from the panel too** | still in the panel while hidden (if auxiliary) |
| user can get it back | no | yes, one tick |

**Prefer `hiddenByDefault`.** Use `available: false` only when the field is genuinely
meaningless on that surface — with `available`, the field disappears from BOTH the
column and the filter panel, which is a capability loss, not a decluttering. The
Subcircuits column earns `available` because the count describes a subtree the flat
listing does not render and the expander does not exist without the plugin's recursive
detail: there is nothing to fall back to.

A filter can be gated independently of its column via `filter.available` (and a target
via `IFilterTarget.available`) — that is the middle ground when the column stays useful
but the param does not apply.

Both facets accept the same three forms (constant / predicate / `byContext` rules) and
`mergeColumnDef` composes a catalog factory's rules with a schema's overrides.

---

## 5. Gotchas — every one of these cost real time

### 5.1 Verify every wire param against ground truth

The backend **silently ignores unknown query params**. An invented or misspelled
filter param does not error; it returns unfiltered results, and the bug reads as "the
filter does nothing". Two oracles, both checked *before* writing the target:

```bash
curl -sS https://staging.openbraininstitute.org/api/entitycore/openapi.json \
  | jq '.paths["/cell-morphology"].get.parameters[] | select(.in=="query") | .name'
```

and the entitycore source, `app/filters/*.py`, for the semantics — mixins are where
the suffixes come from, and `with_prefix(...)` is why nested params read
`cell_morphology_protocol__*`.

**Never infer a param from a naming convention.** Suffix availability differs per
endpoint and per field: `protocol_design` has `__not_in` while `lifecycle_status` has
no list form at all, on the same endpoint. Record the emitted param in a comment next
to every operator list, as the existing schemas do.

### 5.2 Sort safety — the opposite failure mode

`order_by` is validated: an unlisted field is a hard **422**, not a silent no-op. Mark
a column `sortable` only when its resolved `sortField` is in that endpoint's
`Constants.ordering_model_fields`. Those lists can **spread a parent**
(`*ParentFilter.Constants.ordering_model_fields`), so resolve the inheritance chain
before concluding a field is absent.

Concrete counter-example, all in the tree today: `subject__name` **is** in
`ordering_model_fields` for cell-morphology and em-cell-mesh — both schemas override
the catalog default with `subjectNameColumn<Row>({ sortable: true, sortField: 'subject__name' })`
— and is **not** for the density and recording endpoints, where the same factory is
used bare (`subjectNameColumn<Row>()`, whose catalog default is `sortable: false`).
Same field, same mixin, different allowlist.

### 5.3 Host-param collisions — never expose a param the listing pins

Host params merge **after** the user's filters:

```ts
// query-serializer.ts
const params = { page, page_size, ...serializeFilters(...), ...(query.params ?? {}) };
```

So exposing a filter on a param the listing's domain config
(`src/entity-configuration/domain/**`, `api.query.list` / `narrowFilters`) already
pins lets the user build a filter that is then silently overwritten — an applied
filter with no effect. **Grep the entity's domain config for the field before exposing
it.** Two real cases:

- `experimental/cell-morphology.ts` pins `cell_morphology_protocol__generation_type__not_in`,
  so the Generation type column offers only `In` and `Eq` — `__in` is a different param
  name and composes as an intersection; `NotIn` would collide.
- `experimental/ion-channel-recording.ts` pins the **bare** `recording_origin: in_vitro`,
  so recording origin is not offered at all — `Eq` would collide, and `__in` could only
  re-intersect a listing that already *is* the in-vitro recordings.

### 5.4 Filterable ≠ returned

You can filter on a field the list response does not include. The filter works; the
column then renders blank for every row. **Check the response shape before promoting a
filter to a column.** Live examples:

- `validation_result__*` on ion-channel-recording — an existential filter over a
  relation; `IonChannelRecordingRead` serializes no `validation_result` field, so both
  cells are empty for every row (documented in-place, with "move it back to
  `advancedFilters` if that stays true" as the honest fix).
- the em-cell-mesh `measurement_kind__*` / `measurement_item__*` family — left in
  `advancedFilters` for exactly this reason.
- the em-cell-mesh dataset fields — the row carries only the dataset's `{ id }`, so
  the cells resolve through a lazy, id-keyed fetch shared by all three dataset cells
  (`renderers/em-dataset-cell.tsx`).

### 5.5 Persistence: two slices, one flag

State is persisted in **two deliberately separate slices** (`react/persistence/storage-persistence.ts`):

| slice | storage | key | keeps | lifetime |
| --- | --- | --- | --- | --- |
| session | `sessionStorage` | `data-grid:v1:s:<instanceKey>` | `filters`, `sort`, `page`, `pageSize`, `quickFilter` | the browser tab |
| layout | `localStorage` | `data-grid:v1:l:<section>/<dataType>` | `columnOrder`, `hiddenColumns`, `columnWidths` | across sessions |

The split is a product decision, not an implementation detail: a saved **layout** is a
lasting preference ("I never want to see these columns"), whereas a **filter** is a
transient act of browsing that should not silently still be applied a week later.
Selection and expansion are never persisted.

**The two slices are scoped differently, on purpose.** The session slice uses the full
`instanceKey` (the `dataKey`: vlab / project / section / dataType / scope), so filters
never leak between projects or between public and private. The layout slice uses
`layoutKeyFor(section, dataType)` — **section + entity type and nothing else**. A user
who hides three columns on Data → circuit means it for circuits; keeping the lab,
project or scope in that key would hand them a different layout per project and per
public/private toggle, and make them re-hide the same columns over and over.

Pass the layout key at the host: `createDefaultPersistence(layoutKeyFor(section, dataType))`.
The adapter ignores the controller's `instanceKey` when given one.

**The dev switch.** `config.ts` exports `PERSIST_COLUMN_LAYOUT`. Set it to `false` and
`createLocalLayoutPersistence()` returns a no-op adapter: nothing is written, and
anything already written is ignored rather than deleted — so flipping it back on
restores the layouts users already had. The session slice is unaffected either way.
There is no user-facing setting; this is a build-time constant.

#### Reconciliation

A stored `columnOrder` / `hiddenColumns` predates any column you add today.
`core/domain/column-layout.ts` is the single place that reconciliation lives:

- `reconcileColumnOrder` inserts a newly-declared id at its **declared slot** (after
  its nearest already-placed left neighbour). A naive `indexOf`-with-sentinel sort
  appends unknown ids, which used to make every new column render **last** for users
  with saved state.
- `reconcileHiddenColumns` reads "known at save time" off the stored `columnOrder`, so
  an id the snapshot never saw falls back to the schema's `hiddenByDefault`. Without
  that, a newly-declared `hiddenByDefault: true` column would be **visible** for
  everyone with saved state and hidden for everyone else.

Practical upshot: adding an auxiliary column is safe for existing users, and renaming a
column id is not (the old id is dropped, the new one takes its declared default).

### 5.6 Ring / import discipline

Respect **core → react → renderers → bindings → host**, and inside `core/` **import
from the DEFINING module, never from the core barrel** (`core/index.ts`). The barrel
creates a module-init cycle that `tsc` does NOT catch but that breaks every test at
load. The same trap exists one ring out: `host/browse-entity-grid.tsx` imports
`bindings/entitycore/cell-renderers` and `…/data-source.paged` directly, because the
entitycore barrel pulls in the registry → the circuit plugin schema → this host, and
the registry's `definitions` would then see `undefined` for the circuit entry. The
comment is in the file; leave it there.

### 5.7 The type-check gate is currently broken

TypeScript is pinned at **7.0.2**, while `tsconfig.json` still uses `baseUrl` plus
non-relative `paths`. `npx tsc` rejects the config outright:

```
tsconfig.json(17,5): error TS5102: Option 'baseUrl' has been removed.
tsconfig.json(19,15): error TS5090: Non-relative paths are not allowed.
```

It therefore typechecks **nothing** — and `... | grep -c "^src/"` returns `0`, which
reads exactly like a clean run. Workaround until the config is fixed: copy
`tsconfig.json` somewhere scratch, drop `baseUrl`, rewrite `paths` to
`{"@/*": ["./src/*"]}`, and run `tsc -p` against that. Expect **~244 pre-existing
errors** (244 as of this writing) — the signal is that your change adds none.

This needs a real fix (drop `baseUrl`, make `paths` relative in the repo's own
`tsconfig.json`); the workaround is not a substitute.

### 5.8 Testing

Tests live under `src/__tests__/data-grid/**`, mirroring the ring structure
(`core/domain/…`, `react/…`, `bindings/entitycore/…`). **Never co-located.** The gate:

```bash
npx vitest run src/__tests__/data-grid       # 746 tests / 54 files green today
npx @biomejs/biome check --write <changed files>
```

The suites that fail loudest when a param or sort field is wrong are the
`*-parity.test.ts` and `*-advanced-filters*.test.ts` files.

### 5.9 Naming

- types are prefixed `T`, interfaces `I` — `TFilterModel`, `IColumnModel`.
- no string-literal unions: declare an `as const` dict and extract the type —
  `export const Align = { Left: 'left', … } as const; export type TAlign = (typeof Align)[keyof typeof Align];`
- use them **by member**, never by literal: `OperatorId.In`, not `'in'`;
  `WorkspaceSection.Data`, not `'data'`.

---

## Where things live

| concern | file |
| --- | --- |
| schema / column / filter types | `core/domain/schema.ts`, `core/domain/column-model.ts` |
| contextual resolution | `core/domain/contextual.ts`, `core/domain/resolve-schema.ts` |
| derived filter panel | `core/domain/filter-panel.ts` |
| persisted-layout reconciliation | `core/domain/column-layout.ts` |
| controller + state | `core/grid-controller.ts`, `core/state/` |
| column chooser, filter editors, toolbar | `react/` |
| AG Grid adapter | `renderers/aggrid/` |
| shared column factories | `bindings/entitycore/columns/catalog.ts` |
| shared advanced filters + `flatAdvancedFilters` | `bindings/entitycore/schemas/common-filters.ts` |
| per-entity schemas | `bindings/entitycore/schemas/` |
| **the migration flip** | `bindings/entitycore/registry.ts` + `features/views/listing/browse-entity.tsx` |
| operator → entitycore param | `bindings/entitycore/query-serializer.ts` |
| workspace host + plugin bodies | `host/` |
| migration backlog & parity contract | `docs/backlog.md` |
