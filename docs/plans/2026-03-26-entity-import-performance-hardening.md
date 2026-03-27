# Entity Import Performance Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep `src/features/entity-import` responsive with roughly `200` rows by removing duplicated remote work, reducing whole-session recomputation, and narrowing visible-cell rerenders without changing any current CSV, validator, or selection behavior.

**Architecture:** Keep the current controller/session design and optimize it incrementally instead of rewriting it. First lock the current behavior with regression tests, then remove the duplicated validator fetch path, add opt-in upload-scoped remote-validation reuse, consolidate summary recomputation into one pass, and finally reduce table rerenders. All optimizations must preserve the current `0 / 1 / many` remote-resolution semantics, CSV tooltip UX, validator UX, and table scroll behavior.

**Tech Stack:** React 19, TypeScript, TanStack Query, Ant Design Table, Vitest, Testing Library, Biome

---

## Current Issues

1. The validator remote-suggestion flow appears to fetch page `0` twice for the same query.
   `requestValidatorSuggestions()` in `src/features/entity-import/hooks/use-entity-import-controller.ts` sets pending state and then manually calls `field.remote?.query(...)`, while `useInfiniteQuery()` also owns the same request key and fetch cycle.

2. CSV upload can fan out too many remote validations.
   After hydration, the controller builds `remoteValidationTargets` for every imported remote cell. With `200` rows and multiple remote fields, the number of `remote.evaluate()` calls can become large enough to feel slow and stress the backend.

3. Session summary work is likely duplicated.
   `src/features/entity-import/core/session.ts` recalculates summary in `replaceRows()`, while `src/features/entity-import/core/validation.ts` also recalculates summary in `validateSessionRows()`.

4. One cell edit can still rerender more UI than necessary.
   `InlineCell` is memoized, but `src/features/entity-import/ui/inline-cell.tsx` compares the full `row` object, so a single cell update can rerender every visible cell in the same row. In `src/features/entity-import/ui/import-table.tsx`, the `columns` memo also depends on `selectedCell`, so moving selection can rebuild column config.

## Non-Goals

- Do not replace the current controller/session architecture.
- Do not introduce a new state-management library.
- Do not change current CSV upload tooltip content, progress behavior, or dismissal rules.
- Do not change current validator suggestion behavior, including skeletons, load-more, ambiguous results, and protocol-field fixes.
- Do not globally cache remote validation results unless a field explicitly opts in.

## Success Criteria

- A validator search issues only one initial remote request per unique query.
- CSV upload keeps the UI interactive while remote validations are running.
- Summary and submit-state calculations preserve the exact current semantics.
- Editing or selecting cells in a large table rerenders only the visible cells that actually changed.
- Existing entity-import tests continue to pass.

---

### Task 1: Lock Current Performance-Sensitive Behavior With Regression Tests

**Issue:** Performance work is risky here because the feature already has many recent fixes: CSV upload tooltip behavior, validator skeletons, protocol-field remote suggestions, static select handling, and table scroll preservation. If those are not locked down first, a “performance fix” can easily reintroduce bugs the user already reported.

**Remedy:** Add focused regression tests for the specific behaviors that must survive optimization, including request-count assertions for the duplicated validator fetch and coverage for upload-time remote-validation reuse.

**Files:**
- Modify: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Create: `src/features/entity-import/ui/import-table.test.tsx`

**Step 1: Write the failing tests**

Add these tests to `src/features/entity-import/ui/entity-import-feature.test.tsx`:
- `it('fetches the first validator remote suggestion page only once per query')`
- `it('does not duplicate identical csv remote validation requests when the field enables reuse')`
- `it('keeps csv tooltip progress and warning cards unchanged while remote validation work is optimized')`

Add this test to `src/features/entity-import/ui/import-table.test.tsx`:
- `it('re-renders only the previously selected and newly selected visible cells when selection changes')`

Use existing test utilities and patterns already present in the feature test file:
- `createDeferred()`
- upload helpers around `user.upload(...)`
- remote query mocks with `vi.fn()`
- current CSV tooltip assertions

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/ui/import-table.test.tsx`

Expected:
- FAIL because validator search currently performs duplicated initial work
- FAIL because CSV upload currently validates identical remote values independently
- FAIL because there is no table-level rerender guard yet

**Step 3: Write minimal implementation scaffolding**

Do not optimize yet. Only add the minimum test harness support needed to express the failures clearly:
- remote-query mock counters
- upload fixtures with repeated remote values
- lightweight render-counter adapter for `ImportTable`

**Step 4: Run test to verify it still fails for the intended reasons**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/ui/import-table.test.tsx`

Expected: FAIL with assertion messages that point to duplicate requests, duplicate validations, or excess rerenders rather than broken test setup.

**Step 5: Commit**

```bash
git add src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/ui/import-table.test.tsx
git commit -m "test: lock entity import performance regressions"
```

### Task 2: Remove The Duplicated Initial Validator Fetch

**Issue:** `requestValidatorSuggestions()` in `src/features/entity-import/hooks/use-entity-import-controller.ts` sets the request state and then manually calls `field.remote?.query(...)`, while the existing `useInfiniteQuery()` also runs for the same request key. This does extra network work, extra merging, and extra state churn for every validator search.

**Remedy:** Keep the current pending/local-suggestions UX, but make TanStack Query the single owner of remote fetching. `requestValidatorSuggestions()` should prepare the state and request key only; the `useInfiniteQuery()` effect should populate the remote results.

**Files:**
- Modify: `src/features/entity-import/hooks/use-entity-import-controller.ts`
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Use the Task 1 test:
- `it('fetches the first validator remote suggestion page only once per query')`

The test should:
- set up a remote field whose `query` is `vi.fn()`
- type a validator query once
- wait for suggestions to render
- assert the mock was called exactly once for page `0`

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx -t "fetches the first validator remote suggestion page only once per query"`

Expected: FAIL because the remote `query` mock is called more than once for the initial request.

**Step 3: Write minimal implementation**

In `src/features/entity-import/hooks/use-entity-import-controller.ts`:
- keep the current `validatorSelectionQueryKeyRef` guard
- keep the current local-suggestions merge for immediate UI feedback
- keep the current `status: RemoteValidationStatus.Pending` state
- remove the manual `await remoteQuery(...)` block from `requestValidatorSuggestions()`
- let `useInfiniteQuery()` fetch the first page
- keep `fetchNextPage()` unchanged
- keep the current auto-resolve logic in the `validatorSuggestionsInfinite.data` effect unchanged

Do not change:
- the current validator loading skeleton
- the current `source: 'selection' | 'validator'` behavior
- the current exact-match and single-suggestion auto-resolve rules
- the current error-to-message mapping

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx -t "fetches the first validator remote suggestion page only once per query"`

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/entity-import-feature.test.tsx
git commit -m "perf: remove duplicate validator suggestion fetches"
```

### Task 3: Add Opt-In Upload-Scoped Remote Validation Reuse

**Issue:** After CSV hydration, `src/features/entity-import/hooks/use-entity-import-controller.ts` iterates every remote cell and calls `runDirectRemoteValidation(...)`. This is correct for behavior, but it can waste work when many imported cells share the same query and the field result depends only on that query.

**Remedy:** Add an optional remote-validation cache key contract so only fields that explicitly declare safe reuse can share a promise during one CSV upload. Keep the default behavior unchanged for all other fields.

**Files:**
- Modify: `src/features/entity-import/core/adapter.ts`
- Modify: `src/features/entity-import/hooks/use-entity-import-controller.ts`
- Modify: `src/features/entity-import/adapters/cell-morphology/adapter.tsx`
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Test: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

**Step 1: Write the failing tests**

Add coverage proving:
- identical imported remote values can reuse one validation result when the field opts in
- fields that do not opt in still validate per row
- CSV progress still completes per target row even when a promise is shared
- cell-morphology remote fields only opt in when their validation truly depends on normalized query + field identity

Suggested contract to test in `src/features/entity-import/core/adapter.ts`:

```ts
remote?: {
  autoResolveResolvedSuggestion?: boolean;
  query?: (args: RemoteSearchPagedArgs) => Promise<RemoteSearchPageResult>;
  evaluate?: (args: RemoteValidationArgs) => Promise<RemoteValidationResult>;
  getValidationCacheKey?: (args: RemoteValidationArgs) => string | null;
};
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts -t "does not duplicate identical csv remote validation requests when the field enables reuse|cell morphology"`

Expected: FAIL because identical imported values currently trigger independent `evaluate()` calls.

**Step 3: Write minimal implementation**

In `src/features/entity-import/hooks/use-entity-import-controller.ts`:
- create an upload-scoped `Map<string, Promise<RemoteValidationResult>>`
- pass it into CSV-triggered `runDirectRemoteValidation(...)`
- compute a cache key only when `field.remote?.getValidationCacheKey` exists
- reuse the same in-flight promise for matching keys during a single upload
- keep progress accounting per row target, even when the promise is shared
- clear the map when the upload cycle finishes

In `src/features/entity-import/adapters/cell-morphology/adapter.tsx`:
- opt in only for remote fields whose result is safe to share for repeated imported values
- use a normalized key that includes at least field identity and normalized query

Do not change:
- default per-row behavior for fields without `getValidationCacheKey`
- current `0 / 1 / many` resolution semantics
- current error handling
- current CSV tooltip lifecycle

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts -t "does not duplicate identical csv remote validation requests when the field enables reuse|cell morphology"`

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/entity-import/core/adapter.ts src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/adapters/cell-morphology/adapter.tsx src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts
git commit -m "perf: reuse safe remote validations during csv upload"
```

### Task 4: Consolidate Session Summary Computation Into One Pass

**Issue:** Summary calculation is part of submit enablement and invalid-count reporting, so it must stay exact. Right now similar summary work exists in both `src/features/entity-import/core/session.ts` and `src/features/entity-import/core/validation.ts`, which increases per-edit cost on large sessions.

**Remedy:** Centralize summary calculation in one shared helper and allow validated row updates to provide a precomputed summary instead of forcing a second whole-session pass.

**Files:**
- Create: `src/features/entity-import/core/summary.ts`
- Modify: `src/features/entity-import/core/session.ts`
- Modify: `src/features/entity-import/core/validation.ts`
- Test: `src/features/entity-import/core/session.test.ts`
- Test: `src/features/entity-import/core/validation.test.ts`

**Step 1: Write the failing tests**

Add tests proving:
- `validateSessionRows()` preserves the exact current `canSubmit` and `invalidRequiredCellCount` values
- row updates that already have a precomputed summary do not trigger a second summary walk
- session helpers that skip validation still produce correct summary values

Introduce a small exported helper in `src/features/entity-import/core/summary.ts` that can be spied on from tests:

```ts
export function summarizeImportRows(
  rows: Array<IImportRowState>,
  fields: Array<IImportFieldDefinition>
): IImportSessionState['summary'] {
  // current summary semantics moved here unchanged
}
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/core/session.test.ts src/features/entity-import/core/validation.test.ts`

Expected: FAIL because summary work is still duplicated or not yet centralized.

**Step 3: Write minimal implementation**

In `src/features/entity-import/core/session.ts`:
- move summary logic into `src/features/entity-import/core/summary.ts`
- update `replaceRows(...)` to accept an optional precomputed summary, for example:

```ts
function replaceRows(
  session: IImportSessionState,
  nextRows: Array<IImportRowState>,
  options?: { summary?: IImportSessionState['summary'] }
): IImportSessionState
```

In `src/features/entity-import/core/validation.ts`:
- validate the target rows
- compute summary once with `summarizeImportRows(...)`
- return the session using the precomputed summary

Do not change:
- required-field counting rules
- remote pending/invalid counting rules
- row status semantics
- submit enablement semantics

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/core/session.test.ts src/features/entity-import/core/validation.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/entity-import/core/summary.ts src/features/entity-import/core/session.ts src/features/entity-import/core/validation.ts src/features/entity-import/core/session.test.ts src/features/entity-import/core/validation.test.ts
git commit -m "perf: avoid duplicate entity import summary work"
```

### Task 5: Reduce Visible-Cell Rerenders In The Table

**Issue:** Virtualization keeps the DOM size under control, but selection changes and single-cell edits can still rerender more visible cells than necessary. That creates avoidable UI churn in wide tables and is the part most likely to be felt as “laggy” at `200` rows.

**Remedy:** Add explicit `shouldCellUpdate` guards for standard table cells, remove `selectedCell` from the `columns` memo dependency, and make selection-sensitive updates touch only the previously selected and newly selected visible cells. Keep custom renderers conservative so they do not become stale.

**Files:**
- Modify: `src/features/entity-import/ui/import-table.tsx`
- Modify: `src/features/entity-import/ui/inline-cell.tsx`
- Test: `src/features/entity-import/ui/import-table.test.tsx`

**Step 1: Write the failing test**

Use a lightweight test adapter in `src/features/entity-import/ui/import-table.test.tsx` that:
- renders a standard text field
- tracks per-cell render counts
- changes validator selection
- edits one cell

Assert:
- selection change rerenders only the previously selected and newly selected visible cells
- editing one text cell does not rerender unrelated visible text cells in the same viewport

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/import-table.test.tsx`

Expected: FAIL because selection changes currently rebuild table work too broadly.

**Step 3: Write minimal implementation**

In `src/features/entity-import/ui/import-table.tsx`:
- keep virtualization exactly as it is today
- add `shouldCellUpdate` on the row index column, field columns, and actions column where safe
- for standard field columns, compare:
  - `record.cells[field.path] !== prevRecord.cells[field.path]`
  - whether the cell became selected
  - whether the cell stopped being selected
- restructure selection-sensitive data so `columns` no longer depends directly on `selectedCell`
- keep custom `field.tableRenderer` columns conservative; if a custom renderer depends on the full row/session, do not over-optimize it in this task

In `src/features/entity-import/ui/inline-cell.tsx`:
- keep `memo(...)`
- narrow common-control props where practical
- do not remove access to full `row` for renderers that require it

Do not change:
- row action menu behavior
- column resize behavior
- selected-cell styling
- status-badge click behavior
- validator synchronization

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/import-table.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/features/entity-import/ui/import-table.tsx src/features/entity-import/ui/inline-cell.tsx src/features/entity-import/ui/import-table.test.tsx
git commit -m "perf: reduce entity import table rerenders"
```

### Task 6: Final Verification And Profile Gate

**Issue:** The plan only succeeds if it preserves behavior while improving responsiveness. The final gate must verify both.

**Remedy:** Run focused automated coverage first, then do one manual large-fixture check before merging.

**Files:**
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Test: `src/features/entity-import/ui/import-table.test.tsx`
- Test: `src/features/entity-import/core/session.test.ts`
- Test: `src/features/entity-import/core/validation.test.ts`
- Test: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

**Step 1: Run focused verification**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/ui/import-table.test.tsx src/features/entity-import/core/session.test.ts src/features/entity-import/core/validation.test.ts src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

Expected: PASS

**Step 2: Run formatting and lint verification**

Run: `pnpm biome check --write src/features/entity-import/core/adapter.ts src/features/entity-import/core/summary.ts src/features/entity-import/core/session.ts src/features/entity-import/core/validation.ts src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/import-table.tsx src/features/entity-import/ui/inline-cell.tsx src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/ui/import-table.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

Expected: PASS with no remaining issues in touched files

**Step 3: Run one manual large-fixture profile**

Manual checklist:
- upload a `200`-row CSV with repeated remote values and repeated local values
- verify the CSV tooltip still shows correct progress and notification cards
- verify validator suggestions still show skeletons and load-more
- verify table selection and typing still feel responsive during and after upload
- verify there is no duplicate first-page validator request in the network panel

Expected: the feature feels responsive and all baseline behaviors remain intact.

**Step 4: Commit**

```bash
git add src/features/entity-import
git commit -m "perf: harden entity import for larger csv sessions"
```
