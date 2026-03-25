# Cell Morphology CSV Guide

Use the CSV template to bulk import one morphology per row.

## Required columns

- `Name`
- `Description`
- `Brain Region`
- `Subject`
- `License`
- `Protocol`
- `M-type`

## Optional columns

- `Experiment Date`
- `Contact Email`
- `Published In`
- `Location`

## Notes

- Use human-readable labels for searchable reference fields. The import flow resolves them to internal IDs.
- `Location` must contain all `X`, `Y`, and `Z` coordinates together.
- `Contributions` and `Morphology File` are completed in the import UI, not in the CSV.
