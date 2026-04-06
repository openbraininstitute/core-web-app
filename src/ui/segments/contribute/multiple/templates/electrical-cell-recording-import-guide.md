# Electrical Cell Recording CSV Guide

Use the CSV template to bulk import one electrical cell recording per row.

## Required columns

- `Name`
- `Description`
- `Brain Region`
- `Subject`
- `License`
- `E-type`
- `Recording Location`
- `Recording Type`
- `Recording Origin`
- `Contributions`

## Optional columns

- `Experiment Date`
- `Contact Email`
- `Published In`
- `Temperature`
- `LJP`
- `Comment`

## Notes

- Use human-readable labels for searchable reference fields. The import flow resolves them to internal IDs.
- `Recording Location` accepts one of: `Dend`, `Axon`, `Soma`, `Apic`.
- `Recording Type` accepts one of: `intracellular`, `extracellular`, `both`, `unknown`.
- `Recording Origin` accepts one of: `in_vivo`, `in_vitro`, `in_silico`, `unknown`.
- `Temperature` is in degrees Celsius.
- `LJP` is the liquid junction potential in millivolts. Defaults to 0 if left blank.
- `Contributions` accepts tuple arrays in one cell: `[(type, name, role), ...]`.
- `Contributions` supports abbreviated tuples such as `(person, Jane Doe)`, `(Jane Doe)`, or `(Author)`. Ambiguous tokens stay unresolved and must be fixed in the validator.
- Supported contributor types are `person`, `organization`, and `consortium`.
- `NWB File` is completed in the import UI, not in the CSV.

