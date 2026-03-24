import type { FlatImportValues, ImportFieldDefinition } from './contracts';

function normalizeColumnKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function getTemplateFields(fields: Array<ImportFieldDefinition>): Array<ImportFieldDefinition> {
  return fields.filter((field) => field.csv?.include !== false);
}

export function buildTemplateColumns(fields: Array<ImportFieldDefinition>): Array<string> {
  return getTemplateFields(fields).map((field) => field.label);
}

export function importCsvRows({
  fields,
  rows,
}: {
  fields: Array<ImportFieldDefinition>;
  rows: Array<Record<string, string>>;
}): {
  rows: Array<FlatImportValues>;
  strippedColumns: Array<string>;
} {
  const templateFields = getTemplateFields(fields);
  const columnToFieldPath = new Map<string, string>();

  templateFields.forEach((field) => {
    columnToFieldPath.set(normalizeColumnKey(field.label), field.path);
    field.csv?.aliases?.forEach((alias) => {
      columnToFieldPath.set(normalizeColumnKey(alias), field.path);
    });
  });

  const strippedColumns = new Set<string>();

  const importedRows = rows.map((row) => {
    const hydratedRow = Object.fromEntries(
      templateFields.map((field) => [field.path, ''])
    ) as FlatImportValues;

    Object.entries(row).forEach(([columnName, value]) => {
      const matchedFieldPath = columnToFieldPath.get(normalizeColumnKey(columnName));

      if (!matchedFieldPath) {
        strippedColumns.add(columnName);
        return;
      }

      hydratedRow[matchedFieldPath] = value ?? '';
    });

    return hydratedRow;
  });

  return {
    rows: importedRows,
    strippedColumns: Array.from(strippedColumns),
  };
}
