# Entity Import Repair Pipeline Dependency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an ambiguity tooltip for unresolved multi-match cells and a visible-but-disabled `repair_pipeline_state` import field that unlocks only for digital reconstruction protocols.

**Architecture:** Store protocol metadata on remote suggestions, let field dependency callbacks inspect resolved row state, and keep `repair_pipeline_state` in the adapter as a regular select field whose enabled state depends on the resolved protocol generation type. Keep ambiguous cells unresolved in the table, but add an in-cell tooltip that points the user to the validator.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Radix tooltip, Zod

---

### Task 1: Regression tests

**Files:**
- Modify: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Modify: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

**Step 1: Write the failing test**

Add tests for:
- ambiguous remote cells showing an info tooltip in the table
- `repair_pipeline_state` rendering disabled by default
- `repair_pipeline_state` enabling after selecting a digital reconstruction protocol
- removal of `project_id` / `virtual_lab_id` from the cell-morphology import payload/schema expectations

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

Expected: FAIL because the tooltip affordance, protocol metadata dependency, and payload cleanup do not exist yet.

**Step 3: Write minimal implementation**

Implement only enough adapter/controller/UI code to satisfy the new tests.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

Expected: PASS

### Task 2: Suggestion metadata and dependency API

**Files:**
- Modify: `src/features/entity-import/core/contracts.ts`
- Modify: `src/features/entity-import/core/adapter.ts`
- Modify: `src/features/entity-import/core/validation.ts`

**Step 1: Write the failing test**

Use the new adapter/feature tests to prove field dependency callbacks cannot yet inspect resolved protocol metadata.

**Step 2: Run test to verify it fails**

Run the focused tests above and confirm dependency-related failures.

**Step 3: Write minimal implementation**

- Extend suggestions with optional metadata
- Allow `isEnabled` / `getDisabledMessage` to inspect the row state along with flat values

**Step 4: Run test to verify it passes**

Run the focused tests above.

Expected: PASS for the dependency plumbing.

### Task 3: Cell-morphology adapter and tooltip UI

**Files:**
- Modify: `src/features/entity-import/adapters/cell-morphology/services.ts`
- Modify: `src/features/entity-import/adapters/cell-morphology/adapter.tsx`
- Modify: `src/features/entity-import/ui/inline-cell.tsx`

**Step 1: Write the failing test**

Use the same regression tests to prove:
- protocol suggestions do not preserve `generation_type`
- `repair_pipeline_state` does not exist yet
- ambiguous cells have no tooltip affordance

**Step 2: Run test to verify it fails**

Run the focused tests above.

Expected: FAIL

**Step 3: Write minimal implementation**

- Include `generation_type` metadata in protocol suggestions
- Add `repair_pipeline_state` field backed by `RepairPipelineState`
- Disable it unless the resolved protocol is digital reconstruction
- Add the inline tooltip icon for multi-match remote cells
- Remove `project_id` / `virtual_lab_id` from the import schema/payload path that was reintroduced earlier

**Step 4: Run test to verify it passes**

Run the focused tests above.

Expected: PASS

### Task 4: Final verification

**Files:**
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Test: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`
- Test: `src/features/entity-import/core/csv.test.ts`

**Step 1: Run focused verification**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts src/features/entity-import/core/csv.test.ts`

Expected: PASS

**Step 2: Run touched-file lint/format verification**

Run: `pnpm biome check --write src/features/entity-import/core/contracts.ts src/features/entity-import/core/adapter.ts src/features/entity-import/core/validation.ts src/features/entity-import/adapters/cell-morphology/services.ts src/features/entity-import/adapters/cell-morphology/adapter.tsx src/features/entity-import/ui/inline-cell.tsx src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

Expected: PASS
