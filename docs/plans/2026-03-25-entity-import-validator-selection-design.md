# Entity Import Validator Selection Design

**Goal:** Keep the validator panel permanently open, support column-wide validation including an `All` mode, and make table/validator navigation feel synchronized and predictable.

## Decisions

- The validator stays open even with no active table cell.
- Validator selection is no longer modeled as only a focused cell.
- Row and column selection are independent:
  - row can be unset
  - column can be unset
  - column can be `All`
- Table cell highlighting still applies only when a concrete row + concrete column are selected.
- Choosing a concrete column scrolls the table horizontally to that column.
- `Repair Pipeline State` uses the same full-cell select treatment as other inline controls.

## Selection Model

- Introduce a dedicated validator selection state with:
  - `rowId: string | null`
  - `fieldPath: string | null`
- Use a sentinel value for the column `All` mode.
- Keep table highlight derived from whether selection points to a real cell.
- Table cell clicks update both row and column selection.

## Validator UI

- Top controls always render with `Select` placeholders when unset.
- Row selector:
  - removes the standalone `All` button
  - removes the `All` option from the dropdown
- Column selector:
  - gains an `All` dropdown option
- In single-column mode, show one validator card for the selected field.
- In `All` mode, render one full validator card per editable field for the selected row.
- Each all-column card reuses the normal validator UI, including row arrows and editable inputs.
- Changing row from any all-column card updates the shared row state for every card.

## Table UI

- Inline selects fill the cell width and height.
- Entity-import select menus use a shared white surface with `neutral-200` border.
- Selecting a value in `Repair Pipeline State` immediately renders its label in the table cell.

## Testing

- Regression tests for the full-cell `Repair Pipeline State` select.
- Regression tests for persistent validator placeholders.
- Regression tests for column `All` behavior and synchronized per-card row switching.
- Regression tests for automatic horizontal scroll when selecting a column.
