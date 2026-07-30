# antd → AG Grid migration — ticket backlog

**Goal:** migrate every legacy table (the `BrowseEntityScope` entity listings and all
other antd `Table` surfaces) to the new `src/features/data-grid` architecture
(AG Grid Community, hexagonal rings, registry-driven per-entity flip) **without
losing a single feature and without regressions**.

- Branch: `bx93tn/antd-to-aggrid-migration-0b9d90`
- Architecture & contextual-rules authoring: `src/features/data-grid/bindings/entitycore/schemas/CONTEXTUAL.md`
- Flip mechanism: `src/features/views/listing/browse-entity.tsx` routes a dataType to
  the new grid **iff** it is registered in
  `src/features/data-grid/bindings/entitycore/registry.ts`; rollback = delete the
  registry entry. Legacy path stays untouched until its last consumer is migrated.

---

## Feature-parity contract (applies to EVERY listing flip)

The legacy features that must keep working identically after a flip — this is the
shared Definition of Done, referenced by tickets below as **[PARITY]**:

- [ ] Same visible columns, same default order (vs the legacy view-def)
- [ ] Same request params for the same interactions — filters → `field__op`,
      sort → `order_by`, paging → `page`/`page_size`, search → `search`/`ilike_search`
      (oracle: legacy `transformFiltersToQuery` + `useQueryParameters`)
- [ ] Same result counts (narrow filters must come from the entity domain
      `api.query.list` — never restated in the grid)
- [ ] Server-side sorting (three-state: none → desc → asc), filtering (header
      popover incl. facet options with counts + mtype/etype descriptions), search,
      pagination + page-size changer
- [ ] Column chooser (hide/show), drag reorder, resize — all persisted per
      `dataKey` (`data-grid:v1:*` storage; legacy snapshots untouched)
- [ ] Row click opens MiniDetailView; DownloadPanel present
- [ ] Brain-region/species gating + "all species" mode + species-change state reset
- [ ] Scope (Public/Project) filters + selection cleared on scope change
- [ ] Row selection + bulk Download/Delete where the page allows it
- [ ] Un-flipped dataTypes still render the legacy table identically
- [ ] Gates: per-entity parity test green · `pnpm vitest run src/features/data-grid`
      green · `tsc --noEmit` 0 errors on touched paths · biome clean ·
      browser-verified on the live page

---

## T-01 · P0 · Bulk download/delete — ✅ DONE

**Code: commit `67878f286`. Live-verified 2026-07-30** on cell-morphology.
Cross-page row cache (`accumulateSeenRows`, unit-tested) + legacy
`EntityDownloadButton`/`EntityDeleteButton` wired into the grid toolbar's bulk slot,
gated by `allowDownload`/`allowDelete`.

**Acceptance criteria**
- [x] Selecting rows shows "2 selected · Clear · Download entities (2)"
- [x] Selection persists across pages ("3 selected" after selecting on page 2)
- [x] Download fires `POST /api/entity-download/cell-morphology/ticket` → 200 with
      all selected ids (incl. off-page); selection auto-clears on success
- [x] Delete correctly hidden in Public scope (legacy self-gating:
      `isDeletable && scope===project && api.query.delete`); Popconfirm flow is the
      untouched legacy component — *re-check once a project owns deletable rows
      (this project has 0 cell morphologies in Project scope)*
- [x] Clear + scope switch both empty the selection

---

## T-02 · P1 · Flip the experimental entity batch

Author + register grid schemas for the remaining non-expandable experimental
dataTypes: `electrical_cell_recording`, `ion_channel_recording`,
`experimental_neuron_density`, `experimental_bouton_density`,
`experimental_synapses_per_connection`, `em_cell_mesh`,
`universal_cell_morphology` (+ `synthesized_cell_morphology` if listed in the data
section). Compose from `bindings/entitycore/columns/catalog.ts`; add missing
catalog factories (e.g. etype, licence, measurement columns) as they surface.

**Acceptance criteria**
- [ ] One schema file per dataType (30–60 lines, catalog-composed) + registry entry
- [ ] Per-entity parity test (like `__tests__/cell-morphology-parity.test.ts`):
      serialized params == legacy oracle; column ids/order == legacy view-def
- [ ] Custom cell renderers re-authored where the legacy listing had them
      (previews/thumbnails via `@/features/thumbnail/preview`)
- [ ] **[PARITY]** checklist per entity, browser-verified
- [ ] Entity-specific narrow filters confirmed applied (counts match legacy)

## T-03 · P1 · Delete flipped entities' listing-only legacy config

After T-02 verification: remove dead listing-only legacy config for every flipped
dataType — filter-panel field wiring, listing-only renderers/presentation rules.

**Acceptance criteria**
- [ ] Deletions are grep-verified listing-only (fields-defs shared with
      detail/summary/card views are NEVER deleted)
- [ ] Shared machinery (MainTable, ListingFilterPanel, atoms) untouched (→ T-07)
- [ ] Full `tsc` on touched paths + vitest green after deletion
- [ ] Un-flipped listings and all detail views still render correctly

## T-04 · P2 · SimpleGrid preset + task-runner expanded-view migration

Create `src/features/data-grid/presets/simple-grid.tsx` — a light preset of the same
feature (client row model, optional client pagination/sort, same theme, no server
data source) for static/nested tables. Then migrate
`src/features/task-runner/expanded-view.tsx` (antd Table with nested expansion,
rendered inside campaign row expansion) onto it.

**Acceptance criteria**
- [ ] `SimpleGrid` renders client data with the shared theme; columns typed via
      `ColumnModel`; optional client paging/sorting; no entitycore coupling
- [ ] `expanded-view.tsx` has zero antd Table imports; scan-parameter columns +
      status column + nested expansion behave as before
- [ ] Campaign expanded content renders identically inside the legacy listing
      (which still hosts it until T-05)
- [ ] Unit/component test for SimpleGrid basics; gates green

## T-05 · P2 · Detail rows: flip the expandable dataTypes

First real consumer of the built detail machinery (`interleaveDetailRows`,
`DetailRowHost`, `AgDetailCell`). Flip the ~10 `listExpandedViewRegistry`
dataTypes: simulation campaigns (`simulation_campaign`, per-circuit simulation
variants), `circuit_extraction_campaign`, `skeletonization_campaign`, …

**Acceptance criteria**
- [ ] `schema.detail` + `renderDetail` per dataType, rendering the T-04 content
- [ ] Expand chevron parity (placement, expandable-row predicate honored)
- [ ] Detail payload lazily fetched via `entity.api.expandRow`, cached per row id
- [ ] Full-width detail row height stable (no clip/jitter) incl. nested grids;
      collapse on sort/page/filter change
- [ ] **[PARITY]** checklist per entity, browser-verified

## T-06 · P3 · External facets + flip loader-scoped consumers

The host sets `withFacets: false` when a `facetsQueryFn` override exists but never
fetches facets → set filters would show "No options". Add a host-side facets query
feeding `<DataGrid facets={…}>`; then flip the loader-scoped consumers: scan-config
model pickers (`model-selector-single`, `browse-widget`) and ion-channel related
artifacts — the surfaces exercising `listQueryFn`/`facetsQueryFn`/`extraQueryParams`
(incl. `mergeOrderByWithOverride`) and single-select (`selection.mode: 'single'`).

**Acceptance criteria**
- [ ] With `facetsQueryFn`: facet filters show loader-scoped options; without it,
      facets keep coming from the list response
- [ ] `listQueryFn` rows + pagination work; `extraQueryParams.order_by` merges with
      grid sort exactly like legacy
- [ ] Pickers select rows (radio semantics) and propagate to the host form
- [ ] `mainTableProps` usages of each flipped consumer audited & mapped or
      consciously dropped
- [ ] **[PARITY]** where applicable; gates green

## T-07 · P3 · Breadth: all remaining browse entities + legacy stack deletion

Flip everything left that reaches `BrowseEntityScope` (~35 dataTypes total):
model types (`emodel`, `me_model`, `single_neuron_synaptome`, `ion_channel_model`,
circuits variants, …), remaining simulations, `analysis_notebook_template/result`,
workflows + notebooks browse pages. Then delete the legacy listing stack.

**Acceptance criteria**
- [ ] Registry keys ⊇ every dataType routed through `BrowseEntityScope`
      (assert with a test against `AllowedEntities` / browse configs)
- [ ] **[PARITY]** per entity (browser gate at least for one representative of each
      group: model / simulation / notebook / workflows-browse)
- [ ] Delete: `browse-entity-legacy.tsx`, `data-table/index.tsx` (MainTable),
      `use-data-table-columns`, `use-row-selection`, `elements/controls`,
      ListingFilterPanel, `context.tsx` atoms + snapshot storage — after their last
      consumer is gone
- [ ] App-wide grep: no imports of the deleted modules; full gates green

## T-08 · P4 · Circuit explore recursive tables

Rebuild `src/ui/segments/explore/circuit/` (BrowseCircuit flat/hierarchy views,
`RecursiveExpandableTable`) and the detail-view `related-circuits` nested tables on
recursive detail rendering — a detail renderer that mounts another grid
(depth-limited).

**Acceptance criteria**
- [ ] Subcircuit expansion works to depth ≥ 2 with stable heights
- [ ] Flat vs hierarchy toggle, facets, filters, pagination on the circuit listing
      preserved
- [ ] `related-circuits` (root/parent/derived/derived-from/subcircuits) render on
      the new grid; both `expandable-base-table` copies + `recursive-expandable-table`
      + `use-expandable-table` deleted
- [ ] No `BaseTable`/antd Table imports under `explore/circuit`; gates green

## T-09 · P4 · Standalone antd tables → SimpleGrid

Migrate the non-entitycore tables: `project/team/team-listing`,
`virtual-lab-settings/sections/team`, `workspaces/space-manager/sections/project`,
`project/activities`, `project/credits/job-report-list` (client pagination),
`help/priceList/price-table`, `task-logs-stream/elements/configuration`,
`reports/obi-showcases` tables, `PublicProjects/tables/e-model-table`,
e-model detail `exemplar-traces`/`exemplar-morphology`, `workflow-activity`.

**Acceptance criteria**
- [ ] Each surface renders on `SimpleGrid` with its existing columns, sorting,
      row selection and (where present) client pagination
- [ ] Visual spot-check per surface (settings pages, credits, reports)
- [ ] `grep "from 'antd'" src | grep Table` → zero table imports outside
      `node_modules`; gates green

## T-10 · P5 · Teardown, guardrails, UI tests

**Acceptance criteria**
- [ ] `src/ui/segments/data-table/` deleted entirely; `transformFiltersToQuery`
      removed if unused (parity tests updated to a frozen oracle first)
- [ ] Lint/CI guardrail: forbid antd `Table` imports app-wide; forbid `ag-grid-*`
      imports outside `renderers/aggrid` + `features/circuit-nodes`
- [ ] Component tests: header filter popover (open/apply/reset, facet options),
      selection sync (grid↔store, cross-page), detail expand/collapse
- [ ] `circuit-nodes` shared-theme unification filed as follow-up (kept on
      `theme: 'legacy'` for now)

---

## Watch-items (cross-cutting)

- **React Compiler**: never read `store.getSnapshot()` (or any hidden mutable
  state) during render — derive from `useSyncExternalStore` values
  (see `buildGridQuery`).
- **AG Grid headers don't re-render on `context` change** — facet updates need
  `api.refreshHeader()` (already wired); remember for new header-hosted UI.
- **Facet `__in` values are labels (pref_label), never bucket UUIDs.**
- **Radix `SelectValue`** renders empty until first open — always pass the label
  as children.
- Legacy sessionStorage snapshots are a separate namespace from `data-grid:v1:*` —
  keep it that way until T-07 removes the legacy stack.
