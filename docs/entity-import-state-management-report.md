# Entity Import State Management Performance Report

Date: 2026-03-27

Scope: `src/features/entity-import/*`, with the current checked-out code treated as the source of truth.

## Executive Summary

The current entity-import feature is not suffering from a single isolated bottleneck. The lag risk comes from three layers compounding each other:

1. A single large `session` object is owned in one React hook and pushed through the whole feature tree.
2. Most mutations still walk the full row array and always recompute the global import summary.
3. The table and validator both consume broad slices of that state, so one local cell change still causes a wide render pass.

The feature already has several good mitigations:

- Local draft buffering in cells with a `250ms` commit delay and `useTransition` in `InlineCell` (`src/features/entity-import/ui/inline-cell.tsx:65`, `src/features/entity-import/ui/inline-cell.tsx:115-160`).
- Row-targeted validation in the controller (`src/features/entity-import/hooks/use-entity-import-controller.ts:361-383`, `src/features/entity-import/hooks/use-entity-import-controller.ts:470-483`).
- Virtual rows in the Ant table once row count exceeds `20` (`src/features/entity-import/ui/import-table.tsx:122`, `src/features/entity-import/ui/import-table.tsx:540`).
- Background work throttling for async hydration and validation (`src/features/entity-import/hooks/use-entity-import-controller.ts:332-333`).

Those mitigations help, but they do not change the fundamental topology:

- One cell update still maps over `session.rows`.
- One validated row still triggers a full summary scan over all rows.
- One committed update still creates a new top-level `session` object, which reruns `ImportShell`, `ImportTable`, and `ValidatorPanel`.

My conclusion is:

- Jotai is a good fit for this feature.
- The Jotai large-objects recipe is directionally correct, but it should not be copied literally as a single giant nested atom with many ad hoc selectors.
- The best design here is a normalized Jotai feature store with row/cell atom families, plus a few non-library fixes that should land even if you do not migrate state management.

## Current Architecture

### State ownership

`useEntityImportController` owns all feature state locally through React hooks:

- `session`
- `csvUploadPhase`
- `csvRowValidationProgress`
- `csvUploadNotifications`
- `validatorSuggestionRequest`
- `validatorSuggestions`
- `importRun`

Code reference: `src/features/entity-import/hooks/use-entity-import-controller.ts:375-407`.

The largest state object is `IImportSessionState`, which contains:

- `fields`
- `rows`
- `selectedCell`
- `validatorSelection`
- `notifications`
- `summary`

Code reference: `src/features/entity-import/core/contracts.ts:128-135`.

### Render topology

`EntityImportFeature` passes the controller output directly into `ImportShell`, which in turn passes the whole `session` object into both major subtrees:

- `ImportTable`
- `ValidatorPanel`

Code reference:

- `src/features/entity-import/index.tsx:26-47`
- `src/features/entity-import/ui/import-shell.tsx:173-191`
- `src/features/entity-import/ui/import-shell.tsx:391-415`

This means `session` identity changes are high-fan-out changes by default.

### Data shape

The active adapter here defines 13 fields, mixing:

- Primitive text/date/select inputs
- Several remote-select fields
- Two compound/custom-rendered fields: `location` and `contributions`
- A file field

Code reference: `src/features/entity-import/adapters/cell-morphology/adapter.tsx:233-405`.

Important implications:

- Remote validation is not rare. Brain region, subject, license, protocol, and M-type all require lookup or confirmation.
- The `contributions` field performs async CSV hydration and background hydration.
- The `location` and `contributions` cells use custom table renderers, which are heavier than primitive input cells.

Code reference:

- `src/features/entity-import/adapters/cell-morphology/adapter.tsx:337-393`
- `src/features/entity-import/adapters/cell-morphology/adapter.tsx:287-335`
- `src/features/entity-import/core/shared/field-builders.tsx:384-499`

## What Is Working Well Already

The current implementation is not naive. There are deliberate optimizations already in place.

### 1. Keystrokes are locally buffered before committing to feature state

Primitive inputs keep local draft state and flush later:

- `draftInputValue`
- delayed commit with `setTimeout`
- `useTransition` around `actions.updateCellValue`

Code reference: `src/features/entity-import/ui/inline-cell.tsx:109-164`.

This reduces the number of top-level commits during typing, which is good.

### 2. Validation can be scoped to a row

The controller can validate a subset of rows using `rowIds`, and many actions already use that path.

Code reference:

- `src/features/entity-import/hooks/use-entity-import-controller.ts:470-483`
- `src/features/entity-import/hooks/use-entity-import-controller.ts:1429-1579`
- `src/features/entity-import/core/validation.ts:196-229`

### 3. Structural sharing is partially preserved

Row mutation helpers only replace the changed row or rows; unchanged rows are returned by reference.

Code reference:

- `src/features/entity-import/core/session.ts:120-150`
- `src/features/entity-import/core/validation.ts:32-45`

### 4. Table cell rerender control exists for primitive cells

The Ant table uses `shouldCellUpdate` for non-custom cells, which prevents the table from fully repainting every visible primitive cell on every render.

Code reference: `src/features/entity-import/ui/import-table.tsx:452-462`.

## Performance Findings

### Finding 1: A single local cell change still performs global work

Severity: High

The current update path is:

1. `InlineCell` flushes a value.
2. `updateCellValue` commits the row update.
3. `commit` runs validation.
4. Validation always recomputes the global summary.

Code reference:

- `src/features/entity-import/ui/inline-cell.tsx:131-149`
- `src/features/entity-import/hooks/use-entity-import-controller.ts:1429-1437`
- `src/features/entity-import/core/validation.ts:196-229`
- `src/features/entity-import/core/summary.ts:9-35`

Important detail:

- Even when validation is scoped to one row, `validateSessionRows` still maps the full `session.rows` array (`src/features/entity-import/core/validation.ts:209-224`).
- It then always recomputes `summary` across all rows and all fields (`src/features/entity-import/core/validation.ts:227-229`, `src/features/entity-import/core/summary.ts:15-30`).
- `replaceSessionRows` also recomputes summary whenever a caller does not provide one (`src/features/entity-import/core/session.ts:104-117`).

Result:

- Single-row edits are not full revalidations, but they are still not cheap.
- Cost grows with total imported row count, not only with the active row.

### Finding 2: Row lookup and row mutation are still array-based

Severity: Medium

`updateRowById` and `updateRows` both iterate over the full row array.

Code reference: `src/features/entity-import/core/session.ts:120-150`.

That means:

- Updating row 187 still walks rows `1..186`.
- Deleting, clearing, accepting a correction, setting remote state, or setting a file still pay at least an `O(rowCount)` traversal before render cost.

This is acceptable at small scale, but it becomes noticeable once the UI also needs to render table cells, status badges, and validator state.

### Finding 3: The validator panel is globally coupled to the whole session

Severity: High

`ValidatorPanel` receives the whole `session` object and computes status by scanning all rows inside render-time helpers.

Code reference:

- `src/features/entity-import/ui/validator-panel.tsx:99-112`
- `src/features/entity-import/ui/validator-panel.tsx:137-192`
- `src/features/entity-import/ui/validator-panel.tsx:984-1168`

Examples:

- `resolveFieldStatus` maps all rows for a field.
- `resolveRowsSummaryStatus` scans all rows and some fields.
- Row selector options render over `session.rows`.
- In "All columns" mode, one selected row renders a card per field and each card receives the whole `session`.

Result:

- Editing one cell can still make the validator redo cross-row work.
- The validator becomes a meaningful contributor to lag even when the user is mainly interacting with the table.

### Finding 4: `ImportShell` rerenders both main panes on every `session` identity change

Severity: Medium

`ImportShell` passes `session` directly to both `ImportTable` and `ValidatorPanel`.

Code reference: `src/features/entity-import/ui/import-shell.tsx:386-415`.

This means broad state ownership at the controller level still leaks into broad rerender boundaries at the UI level.

### Finding 5: Table virtualization helps scrolling, but not the full update path

Severity: Medium

The table turns on `virtual` mode once there are more than 20 rows.

Code reference: `src/features/entity-import/ui/import-table.tsx:122`, `src/features/entity-import/ui/import-table.tsx:540`.

That helps visible row rendering, but it does not address:

- Full-row-array mutation cost in the controller
- Summary rescans
- Validator rescans
- Background async update storms
- Custom cell renderers

Also note:

- For fields with `tableRenderer`, `shouldCellUpdate` is disabled (`src/features/entity-import/ui/import-table.tsx:398-399`, `src/features/entity-import/ui/import-table.tsx:452-453`).
- The active adapter uses custom renderers for `location` and `contributions`, both of which are heavier cells (`src/features/entity-import/adapters/cell-morphology/adapter.tsx:306-315`, `src/features/entity-import/core/shared/field-builders.tsx:467-495`).

### Finding 6: CSV upload can create commit storms after parsing

Severity: High

After CSV upload:

1. Rows are parsed and hydrated.
2. Background hydration targets are created.
3. Remote validation targets are created.
4. Each background task completion commits back into feature state.

Code reference: `src/features/entity-import/hooks/use-entity-import-controller.ts:1583-1680`.

Why this matters:

- On a large CSV, the number of async completions can be large.
- Each completion can trigger row validation, summary recomputation, and rerender fan-out.
- Concurrency limiting to 6 is helpful, but it does not reduce total number of commits.

This is likely one of the strongest explanations for "everything feels slow right after import".

### Finding 7: "Apply to all" manual edits can degrade into N independent commits

Severity: Critical

This is the clearest hotspot in the current code.

In `SingleColumnValidatorCard`, manual "Apply to all" does this:

1. Build `targetRows`
2. Loop through them
3. Dispatch `setFileValue`, `updateCellValue`, or `setCustomValue` once per row

Code reference:

- `src/features/entity-import/ui/validator-panel.tsx:397-428`
- `src/features/entity-import/ui/validator-panel.tsx:432-468`

For a 200-row CSV, one button click can become roughly:

- 200 controller actions
- 200 validation passes
- 200 summary rescans
- 200 state commits

This is materially worse than the general "single large object" problem and should be fixed even if state management stays on React `useState`.

### Finding 8: `importRun` updates also widen render churn

Severity: Medium

Import progress is separate from `session`, which is correct, but `ImportTable` depends on `importRun.rowResults`, and the column definition memo depends on it.

Code reference:

- `src/features/entity-import/ui/import-table.tsx:151-153`
- `src/features/entity-import/ui/import-table.tsx:323-529`

The row status cell update logic is careful, but import progress still rebuilds the `columns` definition and reruns parent render logic.

This is not the first issue I would fix, but it contributes to the "slow while import is running" feeling.

## Root Cause Summary

The core problem is not only "the object is large".

The actual root causes are:

1. The feature state is broad and centralized.
2. Derived work is recalculated globally.
3. Broad UI nodes subscribe to broad state.
4. Some important actions perform repeated commits instead of batched commits.
5. Async CSV workflows produce many small commits after import.

That is why lag appears in both:

- typing
- scrolling
- post-upload validation
- validator interactions

## Does Jotai Fit This Use Case?

Short answer: yes.

Long answer: yes, if it is used as an atomized feature store, not as a cosmetic wrapper around the same monolithic state shape.

### Why Jotai fits well here

1. The repo already ships Jotai and Jotai-related utilities.

Code reference:

- `package.json:77-79`
- `src/util/atoms.tsx:1-108`

2. The feature’s updates are naturally localized.

Examples:

- one cell changes
- one row gets async validation back
- one row gets a suggestion accepted
- one status badge changes

This is the kind of workload that benefits from atomic subscriptions.

3. The Jotai performance guidance aligns with the problem here.

The official guide explicitly recommends:

- keeping renders cheap
- making observed atoms small
- splitting data into atomic parts
- using `selectAtom`, `focusAtom`, and `splitAtom` to reduce unnecessary rerenders when parts change independently

Source:

- Jotai performance guide: https://jotai.org/docs/guides/performance
- Jotai large objects recipe: https://jotai.org/docs/recipes/large-objects

### How the large-objects recipe maps to this feature

The official recipe describes three relevant tools:

- `focusAtom` for writable focused slices
- `splitAtom` for arrays/lists
- `selectAtom` for read-only selected slices

The recipe specifically calls out the benefit that changing one branch of a nested object should not rerender consumers of another branch.

Source:

- https://jotai.org/docs/recipes/large-objects

That matches this feature very closely:

- Table rows behave like a dynamic list.
- Validator selection is a focused slice.
- Notifications, import progress, and upload status are separate branches.
- Cells are largely independent write targets.

### Important limitation from the Jotai docs

The Jotai docs explicitly describe `selectAtom` as an "escape hatch" and recommend using it only when necessary.

Source:

- https://jotai.org/docs/utilities/select

That matters here.

My recommendation is:

- Prefer writeable atom families and focused atoms for rows and cells.
- Use `selectAtom` only for read-only derived slices where the equality function is genuinely valuable.

### Important practical note

The large-objects recipe uses `focusAtom` from `jotai-optics`.

Source:

- https://jotai.org/docs/recipes/large-objects

That package is not currently present in this repo. If you want to use `focusAtom` directly, you would need to add `jotai-optics`.

## How Jotai Would Improve This Feature

### Recommended state shape

Do not keep a single nested `sessionAtom` shaped exactly like today’s `IImportSessionState`.

Instead, normalize the mutable data.

Recommended shape:

```ts
type ImportFeatureStore = {
  rowOrder: string[];
  rowsById: Record<string, ImportRowState>;
  validatorSelection: {
    rowId: string | null;
    fieldPath: string | null;
  };
  selectedCell: {
    rowId: string;
    fieldPath: string;
  } | null;
  notifications: SessionNotification[];
  summary: SessionSummary;
  csvUpload: CsvUploadState;
  importRun: ImportRunState;
  validatorSuggestions: ValidatorSuggestionState;
};
```

Why normalize:

- Row lookup becomes direct.
- Row mutation stops walking the full row array.
- `splitAtom` or row atom families can target row identity cleanly.
- Batched multi-row operations become much easier.

### Recommended atom strategy

Use Jotai in layers:

1. `featureStoreAtom` for the normalized store root.
2. Focused atoms for top-level branches that truly change independently:
   - `validatorSelectionAtom`
   - `notificationsAtom`
   - `csvUploadAtom`
   - `importRunAtom`
3. Row-level atom family:
   - `rowAtomFamily(rowId)`
4. Cell-level atom family:
   - `cellAtomFamily({ rowId, fieldPath })`
5. Derived atoms for:
   - current selected row
   - current selected field
   - current selected cell
   - submit enablement
   - field status maps
   - row status maps

If you add `jotai-optics`, `focusAtom` can be used for some stable top-level branches. For dynamic row and cell access, I would still prefer `atomFamily` because it maps more naturally to `rowId` and `{ rowId, fieldPath }`.

### UI impact

With a good atom layout:

- `ImportShell` would no longer rerender for every cell edit.
- `ImportTable` would subscribe to `rowOrder` and visible row atoms rather than the entire `session`.
- Each `InlineCell` would subscribe to only its own cell atom plus a small selection atom.
- `ValidatorPanel` would subscribe to:
  - selected row atom
  - selected field atom
  - derived status atoms
  - validator suggestions atom

That reduces render blast radius substantially.

### Logic impact

With normalized rows and atomized writes:

- `setCellValue` becomes direct mutation of one cell atom or one row atom.
- `setCellRemoteState` updates only one cell branch.
- Async CSV completions update only their target rows/cells.
- Multi-row actions can batch inside one write atom instead of looping through React actions.

That addresses the current hot path more directly than `useMemo` tuning alone.

## Where Jotai Helps, and Where It Does Not

### Jotai helps with

- Reducing unnecessary rerenders
- Narrowing subscriptions
- Making row/cell updates local
- Avoiding top-level prop-drill fan-out
- Simplifying batched feature actions

### Jotai does not automatically fix

- Full-summary rescans
- Per-row schema validation cost
- Expensive async lookup volume
- Heavy custom cell renderers
- Ant Table behavior

This is important:

If you migrate to Jotai but keep the same summary algorithm, the same validator scans, and the same repeated "Apply to all" commits, performance will improve, but not enough.

## Other Optimizations That Should Happen Regardless of Store Choice

These are high-value even if you stay on React `useState`.

### 1. Fix "Apply to all" to perform one batched write

This is the highest-leverage change.

Current behavior:

- one manual apply-to-all action dispatches one controller action per row

Desired behavior:

- one manual apply-to-all action dispatches one batched mutation that updates all target rows together
- validate those target rows once
- recompute summary once

### 2. Stop rescanning the full summary for every local change

Current summary logic scans every row and every field.

Code reference: `src/features/entity-import/core/summary.ts:9-35`.

Better options:

- Maintain incremental counters per row and adjust deltas on row updates.
- Or compute per-row summary fragments and aggregate them.

Even without a store migration, this removes a lot of unnecessary work.

### 3. Decouple validator status maps from render-time full-session scans

Current field and row status display logic scans rows in render helpers.

Code reference: `src/features/entity-import/ui/validator-panel.tsx:99-192`.

Better options:

- Precompute field status maps when affected rows change.
- Keep per-field invalid counts and per-row optional-warning flags in derived state.

### 4. Batch async CSV completion updates

Current background hydration and remote validation write back one completion at a time.

Code reference: `src/features/entity-import/hooks/use-entity-import-controller.ts:1663-1679`.

Better options:

- Buffer results in memory and flush once per animation frame.
- Or flush in fixed-size batches, for example every 10 or 20 completed cells.

### 5. Consider a lighter virtual table implementation if Ant Table remains the scroll bottleneck

The state refactor will help scrolling indirectly, but if the table itself remains heavy, the next step would be a more specialized row virtualization layer using the existing `@tanstack/react-virtual` dependency.

This is not the first optimization I would make, but it is the right fallback if Ant Table remains expensive after the state work.

## Is Jotai Better Than the Alternatives?

### Alternative 1: Keep React `useState`, only optimize the current architecture

Pros:

- Lowest migration cost
- Can fix the worst offender immediately
- Easier to ship incrementally

Cons:

- You still keep the broad top-level `session` identity problem
- You still need careful memoization and prop splitting everywhere
- The validator/table coupling remains awkward

Assessment:

- Worth doing for the first few fixes
- Not enough as the long-term architecture for large CSVs

### Alternative 2: Jotai feature store

Pros:

- Already in repo
- Matches existing team patterns
- Good fit for localized row/cell updates
- Lets the UI subscribe narrowly
- Gives a clean path for batched write actions

Cons:

- Migration complexity
- Requires discipline around stable atom references
- `selectAtom` can be misused
- `focusAtom` adds `jotai-optics` if you want that exact recipe

Assessment:

- Best fit for this codebase and this feature

### Alternative 3: Zustand-style or custom external store with selectors

Pros:

- Straightforward "single store + selectors + actions" mental model
- Good subscription granularity if normalized well

Cons:

- Adds a second state pattern for a feature where Jotai already exists
- Not clearly better than Jotai for row/cell-local subscriptions
- You still have to solve batching, summary caching, and validator scans yourself

Assessment:

- Viable
- Not clearly superior here

### Alternative 4: TanStack Store

Pros:

- Strong selector-based subscription model
- Good ergonomics for narrow rerender control

Cons:

- The official React docs are currently under `v0`, and the docs label Store as alpha-era documentation
- Unnecessary adoption risk for a production importer when Jotai is already available

Source:

- https://tanstack.com/store/v0/docs/framework/react/quick-start

Assessment:

- Not recommended as the primary answer for this feature today

## Recommendation

### Recommendation in one sentence

Use Jotai for this feature, but migrate to a normalized, row/cell-atom architecture and land a few targeted logic fixes first.

### Recommended plan

Phase 1. Land no-regret fixes in the current implementation.

- Batch manual "Apply to all" into one mutation.
- Stop recomputing full summary on every local edit.
- Move validator status aggregation out of render helpers.
- Batch async CSV completion writes.

Phase 2. Introduce a feature-scoped Jotai store behind the current controller API.

- Keep the UI API stable while moving state ownership.
- Normalize rows into `rowOrder` + `rowsById`.
- Move top-level feature branches into dedicated atoms.
- Add row and cell atom families.

Phase 3. Narrow UI subscriptions.

- `ImportShell` reads only shell-level atoms.
- `ImportTable` reads row order plus row/cell atoms.
- `ValidatorPanel` reads selection atoms plus derived status atoms.

Phase 4. Re-measure and decide whether Ant Table remains acceptable.

If scrolling still lags after state and batching fixes:

- move to a lighter grid/virtualization layer

## Concrete Jotai Design Proposal

### Atoms

```ts
const rowOrderAtom = atom<string[]>([]);
const rowsByIdAtom = atom<Record<string, IImportRowState>>({});

const validatorSelectionAtom = atom<IValidatorSelectionState>({
  rowId: null,
  fieldPath: null,
});

const notificationsAtom = atom<ISessionNotification[]>([]);
const summaryAtom = atom<ISessionSummary>({ canSubmit: false, invalidRequiredCellCount: 0 });
const importRunAtom = atom<IImportRunState>(createIdleImportRunState());
const csvUploadAtom = atom<CsvUploadState>(initialCsvUploadState);
const validatorSuggestionsAtom = atom<IValidatorSuggestionState>(initialSuggestionState);
```

### Families

```ts
const rowAtomFamily = atomFamily((rowId: string) =>
  atom(
    (get) => get(rowsByIdAtom)[rowId],
    (get, set, updater: (row: IImportRowState) => IImportRowState) => {
      const rows = get(rowsByIdAtom);
      const current = rows[rowId];
      if (!current) return;
      const next = updater(current);
      if (next === current) return;
      set(rowsByIdAtom, { ...rows, [rowId]: next });
    }
  )
);

const cellAtomFamily = atomFamily(({ rowId, fieldPath }: { rowId: string; fieldPath: string }) =>
  atom(
    (get) => get(rowAtomFamily(rowId)).cells[fieldPath],
    (get, set, updater: (cell: IImportCellState) => IImportCellState) => {
      set(rowAtomFamily(rowId), (row) => ({
        ...row,
        cells: {
          ...row.cells,
          [fieldPath]: updater(row.cells[fieldPath]),
        },
      }));
    }
  )
);
```

### Action atoms

Write-only atoms should own:

- `updateCellValue`
- `setCellRemoteState`
- `acceptCorrection`
- `rejectCorrection`
- `applySuggestion`
- `applyValueToRows`
- `hydrateCsvRows`
- `flushAsyncValidationResults`

That keeps write logic centralized and makes batching natural.

## Verification Criteria

After refactoring, I would verify against these conditions:

1. Editing one primitive cell should rerender only:
   - the edited cell
   - the edited row status
   - the validator card for the same selection, if open

2. A background validation completion should not rerender unrelated visible rows.

3. Manual "Apply to all" should produce one batched state transaction, not one transaction per row.

4. Summary recomputation should scale with changed rows, not total rows.

5. A 200-row CSV with remote fields should remain responsive during:
   - scroll
   - typing
   - validator selection changes
   - post-upload background validation

## Final Assessment

Jotai is a strong match for this feature, and the large-objects recipe is useful as a conceptual guide.

However, the real win is not "switch from `useState` to Jotai".

The real win is:

- normalize the data
- localize subscriptions
- batch multi-row writes
- stop global rescans for local changes

If you do those with Jotai, the feature should scale materially better for large CSV imports.

If you do not do those, a store migration alone will only partially improve the problem.

## Sources

- Jotai large objects recipe: https://jotai.org/docs/recipes/large-objects
- Jotai performance guide: https://jotai.org/docs/guides/performance
- Jotai `selectAtom` docs: https://jotai.org/docs/utilities/select
- TanStack Store React quick start: https://tanstack.com/store/v0/docs/framework/react/quick-start
