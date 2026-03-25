# Entity Import CSV Remote Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate remotely resolved import fields immediately after CSV upload so imported labels auto-resolve when there is one match, stay invalid when there are no matches, and stay selectable in the validator when there are multiple matches.

**Architecture:** Reuse the existing remote resolution model instead of creating a second CSV-only path. Add `remote.validate` handlers to the cell-morphology remote fields, then run those validators for each imported remote cell after `hydrateSessionRows()` so the table state is updated with the same `valid / invalid / suggestions / resolvedSuggestion` semantics the validator already uses on manual edits.

**Tech Stack:** React 19, TypeScript, TanStack Query, Vitest, Testing Library

---

### Task 1: CSV upload regression tests

**Files:**
- Modify: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Add tests that upload a CSV into an adapter with remotely validated fields and assert:
- one returned candidate is auto-selected after upload
- zero returned candidates leaves the cell invalid
- multiple returned candidates keep the raw value, expose suggestions, and re-run the query when the user selects the cell in the validator

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: FAIL because CSV upload currently only hydrates rows and never triggers remote validation.

**Step 3: Write minimal implementation**

Use the new tests to drive upload-time remote validation and validator re-query behavior without changing unrelated input flows.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: PASS for the new CSV remote-validation cases.

**Step 5: Commit**

```bash
git add src/features/entity-import/ui/entity-import-feature.test.tsx
git commit -m "test: cover csv remote validation flows"
```

### Task 2: Remote validate handlers for remotely resolved fields

**Files:**
- Modify: `src/features/entity-import/adapters/cell-morphology/services.ts`
- Modify: `src/features/entity-import/adapters/cell-morphology/adapter.tsx`
- Test: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

**Step 1: Write the failing test**

Add coverage proving the cell-morphology adapter remote fields expose `remote.validate` and that the service-level validation resolves the three outcomes:
- `0` matches => invalid result with no resolved suggestion
- `1` match => valid result with `resolvedSuggestion`
- `>1` matches => invalid result with candidate suggestions

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/adapters/cell-morphology/adapter.test.ts`
Expected: FAIL because the remote fields currently only expose `search` / `searchPage`.

**Step 3: Write minimal implementation**

Add reusable validation helpers in `services.ts` and wire them into the remote field configs in `adapter.tsx`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/adapters/cell-morphology/adapter.test.ts`
Expected: PASS for the remote validation contract.

**Step 5: Commit**

```bash
git add src/features/entity-import/adapters/cell-morphology/services.ts src/features/entity-import/adapters/cell-morphology/adapter.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts
git commit -m "feat: add remote validation handlers for import fields"
```

### Task 3: Trigger remote validation after CSV hydration

**Files:**
- Modify: `src/features/entity-import/hooks/use-entity-import-controller.ts`
- Possibly modify: `src/features/entity-import/core/session.ts`
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Use the Task 1 CSV upload tests to prove imported remote fields remain unresolved until this controller logic exists.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: FAIL because imported remote cells remain raw strings with idle remote state.

**Step 3: Write minimal implementation**

After `hydrateSessionRows()`, identify non-empty cells whose fields expose remote resolution, mark them pending, call their validator, and commit the resulting `resolvedSuggestion` or invalid remote state back into the session. Keep the selected-cell validator flow unchanged so clicking an ambiguous cell re-runs the field query for that raw value.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: PASS for CSV upload remote validation.

**Step 5: Commit**

```bash
git add src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/entity-import-feature.test.tsx
git commit -m "feat: validate imported remote cells after csv upload"
```

### Task 4: Final verification

**Files:**
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Test: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`
- Test: `src/features/entity-import/core/csv.test.ts`

**Step 1: Run focused verification**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts src/features/entity-import/core/csv.test.ts`

Expected: PASS

**Step 2: Run formatting/lint verification**

Run: `pnpm biome check --write src/features/entity-import/adapters/cell-morphology/services.ts src/features/entity-import/adapters/cell-morphology/adapter.tsx src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

Expected: PASS with no remaining issues in touched files

**Step 3: Commit**

```bash
git add src/features/entity-import
git commit -m "feat: validate remote import values after csv upload"
```
