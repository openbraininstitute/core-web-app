# Entity Import Performance Fix Plan

Date: 2026-03-27
Based on: `docs/entity-import-state-management-report.md` (verified against current code)

## Phase 1: No-Regret Fixes (Current Architecture)

These fixes land on the existing `useState` architecture. They reduce the worst hotspots without requiring a store migration. Each can be shipped independently.

### 1.1 Batch manual "Apply to all" into one commit

**Problem:** `SingleColumnValidatorCard.handleApply` loops `targetRows.forEach(commitManualValueToRow)` for non-suggestion manual edits. Each iteration dispatches a separate `updateCellValue`, `setFileValue`, or `setCustomValue` action. For 200 rows, that's 200 commits, 200 validations, 200 summary rescans.

**Note:** The suggestion-based "apply to all" path (`applySuggestion` with `applyToAllMatching: true`) is already batched into one commit via `resolveSuggestionToRows` / `stageSuggestionToRows`. This fix targets only the manual value path.

**Fix:**
- Add a new session mutation `applyManualValueToRows(session, { fieldPath, value, targetRowIds })` in `session.ts` that updates all target rows in one pass.
- Add a corresponding controller action `applyManualValueToAll` that calls `commit()` once with all affected `rowIds`.
- Replace the `targetRows.forEach(commitManualValueToRow)` loop in `handleApply` with a single call to the new action.

**Files:**
- `src/features/entity-import/core/session.ts` — add `applyManualValueToRows`
- `src/features/entity-import/hooks/use-entity-import-controller.ts` — add `applyManualValueToAll` action
- `src/features/entity-import/core/adapter.ts` or `contracts.ts` — extend `IEntityImportActions` with the new action
- `src/features/entity-import/ui/validator-panel.tsx` — replace the loop in `handleApply`

**Verification:** One "Apply to all" click on a 200-row CSV should produce exactly one `setSession` call (observable via React DevTools profiler or a temporary `console.count` in `commit`).

### 1.2 Make summary recomputation incremental

**Problem:** `summarizeImportRows` scans every row × every field on every call. It runs after every `commit` that includes validation, and also inside `replaceSessionRows` when no explicit summary is provided.

**Fix:**
- Change `summarizeImportRows` to accept an optional `previousSummary` and a `changedRowIds` set.
- When `changedRowIds` is provided, compute the delta: subtract the old contribution of changed rows, add the new contribution.
- Thread `changedRowIds` through `validateSessionRows` → `replaceSessionRows` → `summarizeImportRows`.
- For full-session operations (CSV upload, initial load), fall back to the current full scan.

**Files:**
- `src/features/entity-import/core/summary.ts` — add incremental path
- `src/features/entity-import/core/validation.ts` — pass `rowIds` to summary
- `src/features/entity-import/core/session.ts` — thread changed row info through `replaceSessionRows`

**Verification:** After editing one cell in a 200-row session, `summarizeImportRows` should iterate only the changed row(s), not all 200.

### 1.3 Move validator status aggregation out of render-time helpers

**Problem:** `resolveFieldStatus` and `resolveRowsSummaryStatus` in `validator-panel.tsx` scan all rows during render. They run on every rerender of `ValidatorPanel`, which happens on every `session` identity change.

**Fix:**
- Precompute a `fieldStatusMap: Record<string, TValidatorFieldStatus>` and a `rowsSummaryStatus: TValidatorFieldStatus` inside the controller (or as a derived value next to summary).
- Store them alongside `summary` in the session or as a separate controller output.
- `ValidatorPanel` reads the precomputed values instead of scanning rows.

**Files:**
- `src/features/entity-import/core/summary.ts` or new `status-maps.ts` — add `computeFieldStatusMap`, `computeRowsSummaryStatus`
- `src/features/entity-import/hooks/use-entity-import-controller.ts` — expose precomputed status maps
- `src/features/entity-import/ui/validator-panel.tsx` — consume precomputed values, remove render-time scans

**Verification:** `resolveFieldStatus` and `resolveRowsSummaryStatus` should no longer appear in React profiler flame graphs for `ValidatorPanel` renders.

### 1.4 Batch async CSV completion writes

**Problem:** After CSV upload, `runDirectRemoteValidation` and `runBackgroundImportedCellHydration` each call `commit()` individually when they complete. With 6 concurrent tasks and many cells, this creates a rapid stream of individual state updates.

**Fix:**
- Introduce a microbatch buffer: collect completed results in a `Map<string, PendingCellUpdate>` ref.
- Flush the buffer on `requestAnimationFrame` (or a short `setTimeout` of ~50ms).
- The flush performs one `commit()` that applies all buffered cell updates and validates all affected `rowIds` together.

**Files:**
- `src/features/entity-import/hooks/use-entity-import-controller.ts` — add buffer ref, flush logic, modify `runDirectRemoteValidation` and `runBackgroundImportedCellHydration` to buffer instead of committing directly

**Verification:** During CSV upload of 50 rows with remote fields, the number of `setSession` calls should drop from ~50+ to ~5-10 batched flushes.

---

## Phase 2: Jotai Feature Store Migration

Migrate state ownership from `useState` in the controller to a normalized Jotai store. Keep the controller API surface stable so UI components don't need to change their prop signatures during migration.

### 2.1 Create the normalized Jotai store

**Atoms:**
```
rowOrderAtom          — string[]
rowsByIdAtom          — Record<string, IImportRowState>
validatorSelectionAtom — IValidatorSelectionState
selectedCellAtom      — ISelectedCellState | null
notificationsAtom     — ISessionNotification[]
summaryAtom           — ISessionSummary
csvUploadAtom         — { phase, progress, notifications }
importRunAtom         — IImportRunState
validatorSuggestionsAtom — IValidatorSuggestionState
validatorPreviewAtom  — IValidatorPreviewState
```

**Families:**
```
rowAtomFamily(rowId)                    — focused read/write on rowsByIdAtom[rowId]
cellAtomFamily({ rowId, fieldPath })    — focused read/write on row.cells[fieldPath]
```

**Derived atoms:**
```
activeRowAtom         — reads validatorSelectionAtom + rowAtomFamily
activeFieldAtom       — reads validatorSelectionAtom + adapter fields
fieldStatusMapAtom    — reads rowsByIdAtom + fields, memoized
canSubmitAtom         — reads summaryAtom
```

**Write atoms (actions):**
```
updateCellValueAtom
setCellRemoteStateAtom
applyManualValueToAllAtom
applySuggestionAtom
batchFlushCsvResultsAtom
```

**Files:**
- New: `src/features/entity-import/state/store.ts` — atom definitions
- New: `src/features/entity-import/state/actions.ts` — write atoms
- New: `src/features/entity-import/state/derived.ts` — derived/selector atoms
- New: `src/features/entity-import/state/families.ts` — row and cell atom families

**Note:** `jotai-optics` is not in the repo. Use `atomFamily` from `jotai/utils` (already available) or `jotai-family` (v1.0.1, already installed) for row/cell families. Avoid adding `jotai-optics` unless `focusAtom` proves necessary for a specific use case.

### 2.2 Bridge the controller to the Jotai store

- `useEntityImportController` becomes a thin bridge that reads from Jotai atoms and exposes the same `session` + `actions` shape.
- Internally, `commit()` writes to the Jotai store instead of calling `setSession`.
- This lets `ImportShell`, `ImportTable`, and `ValidatorPanel` continue receiving props unchanged during migration.

**Files:**
- `src/features/entity-import/hooks/use-entity-import-controller.ts` — refactor to use Jotai store internally

### 2.3 Provide the store via a scoped Provider

- Wrap `EntityImportFeature` in a Jotai `Provider` with a feature-scoped store.
- This isolates the import feature's atoms from the rest of the app.

**Files:**
- `src/features/entity-import/index.tsx` — add scoped `Provider`
- New: `src/features/entity-import/state/provider.tsx` — feature store provider

---

## Phase 3: Narrow UI Subscriptions

Once the Jotai store is in place, progressively narrow what each UI component subscribes to.

### 3.1 ImportShell

- Reads only `notificationsAtom`, `csvUploadAtom`, and layout-level state.
- No longer receives or passes the full `session` object.

### 3.2 ImportTable

- Reads `rowOrderAtom` for the row list.
- Each row render reads `rowAtomFamily(rowId)`.
- Each cell render reads `cellAtomFamily({ rowId, fieldPath })` + `selectedCellAtom`.
- `shouldCellUpdate` can be simplified or removed since Jotai subscriptions handle granularity.

### 3.3 ValidatorPanel

- Reads `validatorSelectionAtom`, `activeRowAtom`, `activeFieldAtom`.
- Reads `fieldStatusMapAtom` for the column list status indicators.
- Reads `validatorSuggestionsAtom` for suggestion display.
- No longer receives the full `session`.

### 3.4 InlineCell

- Reads `cellAtomFamily({ rowId, fieldPath })` directly.
- Local draft buffering stays as-is (it's already good).

**Verification:** After Phase 3, editing one primitive cell should rerender only:
1. The edited `InlineCell`
2. The edited row's status indicator
3. The validator card for the current selection (if it matches the edited cell)

Nothing else in the tree should rerender.

---

## Phase 4: Re-evaluate Table Performance

After Phases 1-3, measure scroll and interaction performance on a 200-row CSV with remote fields.

If Ant Table remains a bottleneck:
- Consider replacing the Ant `<Table>` with a custom virtualized grid using `@tanstack/react-virtual` (already in deps at v3.13.19).
- This would give full control over row/cell rendering, remove Ant Table's internal reconciliation overhead, and integrate naturally with Jotai cell atoms.

This is not recommended as a first step. Only pursue if profiling after Phase 3 shows the table itself is still the dominant cost.

---

## Priority Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| 1 | 1.1 Batch "Apply to all" | Small | Critical — eliminates the single worst hotspot |
| 2 | 1.4 Batch async CSV completions | Medium | High — eliminates post-upload lag |
| 3 | 1.2 Incremental summary | Medium | High — reduces cost of every single edit |
| 4 | 1.3 Precompute validator status | Small | Medium — removes render-time scans |
| 5 | 2.1-2.3 Jotai store migration | Large | High — enables Phase 3 |
| 6 | 3.1-3.4 Narrow subscriptions | Medium | High — final render optimization |
| 7 | 4 Table re-evaluation | Large | Conditional — only if needed |

## Notes

- Phase 1 tasks are independent and can be shipped in any order.
- Phase 2 should be done as one cohesive migration behind the existing controller API.
- Phase 3 can be done incrementally per component.
- The report's minor inaccuracy: it states `shouldCellUpdate` is "disabled" for custom renderer fields. In reality, custom renderer fields have `shouldCellUpdate` but use a broader `record !== prevRecord` check instead of the granular cell-identity check. The practical impact is the same (more rerenders for custom cells), but the mechanism is different.
