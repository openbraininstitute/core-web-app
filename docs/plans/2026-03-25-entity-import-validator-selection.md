# Entity Import Validator Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the validator always open, support row/column independent selection with a column `All` mode, keep all-column cards fully editable with shared row arrows, scroll the table to selected columns, and fix the full-cell `Repair Pipeline State` select UX.

**Architecture:** Split validator selection from single-cell table focus, then render validator cards from that shared selection state. Keep concrete cell selection available for table highlighting and remote suggestion flows, but allow nullable row/column states plus a column-all sentinel. Reuse a shared select menu style for inline and validator selects.

**Tech Stack:** React 19, TypeScript, Ant Design Table, Radix Select, Vitest, Testing Library

---

### Task 1: Add failing integration tests

**Files:**
- Modify: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Add tests for:
- persistent validator with `Select` placeholders when nothing is selected
- column selector containing `All` while row selector does not
- all-column mode rendering one validator box per field and syncing row changes across boxes
- selecting a column causing horizontal table scroll
- full-cell `Repair Pipeline State` select styling/value rendering

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`

Expected: FAIL because the validator is still single-cell only and the repair select does not yet use the new full-cell/select-menu behavior.

**Step 3: Write minimal implementation**

Implement only enough production code to satisfy the new tests.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`

Expected: PASS

### Task 2: Extend session selection state

**Files:**
- Modify: `src/features/entity-import/core/contracts.ts`
- Modify: `src/features/entity-import/core/session.ts`
- Modify: `src/features/entity-import/core/session.test.ts`
- Modify: `src/features/entity-import/core/adapter.ts`
- Modify: `src/features/entity-import/hooks/use-entity-import-controller.ts`

**Step 1: Write the failing test**

Add session-level coverage for nullable validator row/column selection and the column-all sentinel.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/core/session.test.ts`

Expected: FAIL because selection is currently modeled only as a concrete `selectedCell`.

**Step 3: Write minimal implementation**

- Add dedicated validator selection state
- Keep `selectCell` for table-originated concrete selection
- Add setter for partial validator selection
- Preserve existing remote suggestion behavior for concrete field selection

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/core/session.test.ts`

Expected: PASS

### Task 3: Refactor validator panel into reusable cards

**Files:**
- Modify: `src/features/entity-import/ui/validator-panel.tsx`

**Step 1: Write the failing test**

Use the feature test to prove the validator:
- collapses to a minimal empty state
- cannot represent column `All`
- cannot synchronize row changes across cards

**Step 2: Run test to verify it fails**

Run the feature test from Task 1.

Expected: FAIL

**Step 3: Write minimal implementation**

- Render top selectors with nullable placeholders
- Remove row `All`
- Add column `All`
- Extract a reusable validator field card
- Render one card or many depending on selection
- In all-column mode, reuse the same editable validator card for each field
- Keep all-column cards bound to the same row state and synchronize row arrows across them

**Step 4: Run test to verify it passes**

Run the feature test from Task 1.

Expected: PASS

### Task 4: Table scroll and inline select polish

**Files:**
- Modify: `src/features/entity-import/ui/import-table.tsx`
- Modify: `src/features/entity-import/ui/inline-cell.tsx`
- Modify: `src/features/entity-import/ui/validator-panel.tsx`

**Step 1: Write the failing test**

Use the feature test to prove:
- selected columns do not scroll into view
- inline select triggers do not fill the cell
- select menus are not consistently styled
- `Repair Pipeline State` does not show the chosen label correctly

**Step 2: Run test to verify it fails**

Run the feature test from Task 1.

Expected: FAIL

**Step 3: Write minimal implementation**

- Scroll AntD table body to the selected concrete column
- Apply shared entity-import select trigger/content styles
- Ensure inline select triggers use full width/height
- Ensure selected labels render immediately in the table cell

**Step 4: Run test to verify it passes**

Run the feature test from Task 1.

Expected: PASS

### Task 5: Final verification

**Files:**
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Test: `src/features/entity-import/core/session.test.ts`
- Test: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

**Step 1: Run focused verification**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/core/session.test.ts src/features/entity-import/adapters/cell-morphology/adapter.test.ts`

Expected: PASS

**Step 2: Run touched-file formatting/lint verification**

Run: `pnpm biome check --write src/features/entity-import/core/contracts.ts src/features/entity-import/core/session.ts src/features/entity-import/core/session.test.ts src/features/entity-import/core/adapter.ts src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/validator-panel.tsx src/features/entity-import/ui/import-table.tsx src/features/entity-import/ui/inline-cell.tsx src/features/entity-import/ui/entity-import-feature.test.tsx`

Expected: PASS
