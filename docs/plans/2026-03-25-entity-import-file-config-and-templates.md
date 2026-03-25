# Entity Import File Config And Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make entity-import file fields configurable and reusable, and add adapter-driven template downloads for both CSV and per-entity Markdown guides.

**Architecture:** Extend the entity-import adapter contract with generic file-field configuration and template metadata. Keep CSV generation schema-driven from the adapter fields, while Markdown guides live under `src/features/entity-import/templates/<entity-type>/` and are downloaded through a small menu in the shell header. Update both the inline table cell and validator panel to consume the same file-field config so the UX stays consistent.

**Tech Stack:** React 19, Next.js 16, TypeScript, Vitest, Testing Library, Radix dropdown menu, Papa Parse

---

### Task 1: Adapter contract for files and templates

**Files:**
- Modify: `src/features/entity-import/core/adapter.ts`
- Modify: `src/features/entity-import/core/contracts.ts`
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Add adapter fixtures that declare file configuration and template-guide metadata, then assert the shell renders a menu button derived from `templateFileName`.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: FAIL because the shell still renders the old fixed CSV button and the adapter type has no file/template metadata.

**Step 3: Write minimal implementation**

Add typed adapter config for:
- file constraints: `accept`, `maxSizeBytes`, `maxFiles`, `allowedExtensions`, `buttonLabel`
- template downloads: entity template key plus guide asset metadata

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: PASS for the new menu-button rendering behavior.

**Step 5: Commit**

```bash
git add src/features/entity-import/core/adapter.ts src/features/entity-import/core/contracts.ts src/features/entity-import/ui/entity-import-feature.test.tsx
git commit -m "feat: add generic import file and template metadata"
```

### Task 2: Generic file upload behavior

**Files:**
- Modify: `src/features/entity-import/hooks/use-entity-import-controller.ts`
- Modify: `src/features/entity-import/ui/inline-cell.tsx`
- Modify: `src/features/entity-import/ui/validator-panel.tsx`
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Add tests that verify:
- the file trigger fills the whole cell
- the default label is `Add file(s)`
- morphology shows `Add file(s)` with allowed extensions
- invalid file selections are rejected for mime type / size / count

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: FAIL because file fields still use hard-coded labels and no validation.

**Step 3: Write minimal implementation**

Use a shared file-field helper to:
- derive the label from adapter config
- render a full-cell trigger
- validate selection before committing state
- store `File` for `ImportInputType.File` and `File[]` for `ImportInputType.FileBundle`

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: PASS for file-field rendering and validation.

**Step 5: Commit**

```bash
git add src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/inline-cell.tsx src/features/entity-import/ui/validator-panel.tsx src/features/entity-import/ui/entity-import-feature.test.tsx
git commit -m "feat: make import file fields configurable"
```

### Task 3: Template asset registry and grouped guides

**Files:**
- Create: `src/features/entity-import/templates/cell-morphology/guide.md`
- Create: `src/features/entity-import/templates/registry.ts`
- Modify: `src/features/entity-import/adapters/cell-morphology/adapter.tsx`
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Add a test proving the adapter can expose template download metadata and the shell/controller can request a Markdown guide alongside the CSV flow.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: FAIL because there is no template registry and no guide asset.

**Step 3: Write minimal implementation**

Create grouped template assets under `src/features/entity-import/templates/`, add a registry that resolves the Markdown text for a given adapter template key, and wire the cell-morphology adapter to its guide.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: PASS for guide asset lookup and download wiring.

**Step 5: Commit**

```bash
git add src/features/entity-import/templates src/features/entity-import/adapters/cell-morphology/adapter.tsx src/features/entity-import/ui/entity-import-feature.test.tsx
git commit -m "feat: add entity import template guides"
```

### Task 4: Header menu for CSV and guide downloads

**Files:**
- Modify: `src/features/entity-import/index.tsx`
- Modify: `src/features/entity-import/ui/import-shell.tsx`
- Modify: `src/features/entity-import/hooks/use-entity-import-controller.ts`
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`

**Step 1: Write the failing test**

Add tests for the new dropdown-menu control below the modal title that exposes:
- `Download CSV`
- `Download Guide`

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: FAIL because only the old one-click CSV button exists.

**Step 3: Write minimal implementation**

Replace the fixed button with a Radix dropdown-menu trigger named from `adapter.templateFileName`, keep CSV generation in the controller, and add a guide-download action that writes the Markdown asset to the browser download flow.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx`
Expected: PASS for both menu actions.

**Step 5: Commit**

```bash
git add src/features/entity-import/index.tsx src/features/entity-import/ui/import-shell.tsx src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/entity-import-feature.test.tsx
git commit -m "feat: add import template download menu"
```

### Task 5: Final verification

**Files:**
- Test: `src/features/entity-import/ui/entity-import-feature.test.tsx`
- Test: `src/features/entity-import/adapters/cell-morphology/adapter.test.ts`
- Test: `src/features/entity-import/core/csv.test.ts`

**Step 1: Run focused verification**

Run: `pnpm vitest run --config vitest.entity-import.config.ts src/features/entity-import/ui/entity-import-feature.test.tsx src/features/entity-import/adapters/cell-morphology/adapter.test.ts src/features/entity-import/core/csv.test.ts`

Expected: PASS

**Step 2: Run formatting/lint verification**

Run: `pnpm biome check src/features/entity-import/core/adapter.ts src/features/entity-import/hooks/use-entity-import-controller.ts src/features/entity-import/ui/import-shell.tsx src/features/entity-import/ui/inline-cell.tsx src/features/entity-import/ui/validator-panel.tsx src/features/entity-import/adapters/cell-morphology/adapter.tsx src/features/entity-import/templates/registry.ts src/features/entity-import/ui/entity-import-feature.test.tsx`

Expected: PASS with no errors

**Step 3: Commit**

```bash
git add src/features/entity-import
git commit -m "feat: generalize import file inputs and template downloads"
```
