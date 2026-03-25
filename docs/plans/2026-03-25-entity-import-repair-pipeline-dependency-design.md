# Entity Import Repair Pipeline Dependency Design

**Goal:** Keep ambiguous remotely validated cells actionable in-table and add a visible-but-disabled `repair_pipeline_state` field that only becomes editable when the selected protocol is a digital reconstruction.

## Decisions

- Ambiguous remote matches stay in the table as the user-entered value.
- When a cell has multiple remote matches, the table cell shows an info icon.
- Hovering the icon opens a tooltip with clear instructions to open the validator and choose the correct value.
- `repair_pipeline_state` is always visible in the cell-morphology import table and validator.
- `repair_pipeline_state` is disabled unless the resolved protocol has `generation_type === "digital_reconstruction"`.
- Protocol suggestions carry extra metadata so downstream field dependencies can inspect the resolved protocol type without parsing labels.
- `project_id` and `virtual_lab_id` are not added back to the import schema; request context already travels through headers.

## Architecture

- Extend remote suggestions with optional metadata payloads.
- Preserve protocol `generation_type` in protocol search results and selected suggestions.
- Generalize field dependency callbacks so they can inspect the full row state, not only flat string values.
- Define `repair_pipeline_state` as a normal select field in the cell-morphology adapter using the shared protocol constants.
- Ignore disabled `repair_pipeline_state` values when constructing the outgoing payload.

## UX

- Ambiguous remote cells display an inline info affordance instead of relying only on validator messaging.
- Disabled `repair_pipeline_state` cells remain visible with disabled styling.
- The validator explains why `repair_pipeline_state` is unavailable until a digital reconstruction protocol is selected.

## Testing

- Regression test for the ambiguity tooltip in the table cell.
- Regression test for visible-but-disabled `repair_pipeline_state`.
- Regression test for enabling `repair_pipeline_state` after selecting a digital reconstruction protocol.
- Keep focused entity-import and cell-morphology adapter tests green.
