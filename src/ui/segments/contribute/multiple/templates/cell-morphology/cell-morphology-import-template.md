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
- `Contributions`

## Optional columns

- `Experiment Date`
- `Contact Email`
- `Published In`
- `Location`

## Notes

- Use human-readable labels for searchable reference fields. The import flow resolves them to internal IDs.
- `Contributions` accepts tuple arrays in one cell: `[(type, name, role), ...]`.
- `Contributions` supports fixed three-slot tuples with blanks and abbreviated tuples such as `(person, Jane Doe)`, `(Jane Doe)`, or `(Author)`. Ambiguous tokens stay unresolved and must be fixed in the validator.
- Supported contributor types are `person`, `organization`, and `consortium`.
- `Location` accepts `(x, y, z)` and also keeps backward compatibility with `x, y, z`.
- `Morphology File` is still completed in the import UI, not in the CSV.
