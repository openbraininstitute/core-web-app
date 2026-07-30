# data-grid migration backlog

Status of the antd → AG Grid (Community) migration. Architecture + decisions:
`bindings/entitycore/schemas/CONTEXTUAL.md` and the commits on
`bx93tn/antd-to-aggrid-migration-0b9d90`.

## Done

- ✅ Foundation: hexagonal rings (`core/` → `react/` → `renderers/aggrid/` →
  `bindings/entitycore/` → `host/`), router split in `browse-entity.tsx`
  (registry-driven per-entity flip, rollback = delete one registry line)
- ✅ `cell_morphology` flipped with parity harness (params == legacy
  `transformFiltersToQuery`, column order == legacy view-def)
- ✅ React Compiler refetch fix (`buildGridQuery(state, params)` from reactive state)
- ✅ Contextual presentation engine (`core/domain/contextual.ts`): declarative
  `byContext({default, rules})` + open `GridContext.factors`; contextual
  `available` / `order` / `hiddenByDefault` / `filter.available`
- ✅ Styling program: header-hosted round filter buttons + Radix popover with
  `ui/molecules` inputs (rounded-xl), three-state sort icons, pinned selection
  column (configurable `SelectionSpec`), resizable preview, centered fully-rounded
  pagination + molecules page-size Select, legacy-style pill search
- ✅ **[P0] Real bulk download/delete** — cross-page row cache
  (`accumulateSeenRows`) + legacy `EntityDownloadButton`/`EntityDeleteButton`
  wired in the host bulk slot *(pending a final visual check)*

## Backlog (by priority)

| # | P | Ticket | Blocked by |
|---|---|--------|------------|
| 11 | P1 | Flip experimental entity batch (~7 schemas: electrical_cell_recording, ion_channel_recording, experimental_neuron_density, experimental_bouton_density, experimental_synapses_per_connection, em_cell_mesh, universal/synthesized cell morphology) with per-entity parity tests + browser gates | — |
| 12 | P1 | Delete flipped entities' listing-only legacy config (grep-verified; shared stack stays until #16) | 11 |
| 13 | P2 | `presets/simple-grid.tsx` (client row model preset) + migrate `task-runner/expanded-view.tsx` off antd Table | — |
| 14 | P2 | Detail rows: flip the ~10 expandable simulation/campaign dataTypes (`schema.detail` + `renderDetail`, lazy `entity.api.expandRow`) — first consumer of the built detail machinery | 13 |
| 15 | P3 | External facets when `facetsQueryFn`/`listQueryFn` overrides exist (host fetches facets, feeds DataGrid's external facets prop) + flip scan-config pickers & ion-channel related artifacts | — |
| 16 | P3 | Breadth: all remaining model/simulation/notebook entities (~35 total incl. workflows/notebooks browse); assert registry covers every routed dataType; then delete `browse-entity-legacy.tsx`, MainTable, ListingFilterPanel, `use-data-table-columns`, `use-row-selection`, context atoms + snapshot storage | 11, 15 |
| 17 | P4 | Circuit explore recursive subcircuit tables on recursive detail rendering (delete both `expandable-base-table` copies) | — |
| 18 | P4 | Standalone antd tables → SimpleGrid (team listings, space-manager, activities, credits, price table, task-logs config, obi-showcases, PublicProjects e-model, e-model exemplars, workflow-activity) — exit: zero antd Table imports | — |
| 19 | P5 | Teardown: delete `src/ui/segments/data-table/`; CI guardrail (no antd Table imports; no `ag-grid-*` outside `renderers/aggrid` + `circuit-nodes`); component tests for filter popover + selection sync | 16, 17, 18 |

## Known watch-items

- `facetsQueryFn` consumers currently get `withFacets: false` and NO external
  facets (→ empty set-filter options) until #15.
- `mainTableProps` passed by some BrowseEntityScope consumers is ignored by the
  grid host — audit per entity at flip time (#11/#16).
- Legacy snapshots live in a separate storage namespace (`data-grid:v1:*` is
  ours) — rollback stays safe until #16 deletes the legacy stack.
