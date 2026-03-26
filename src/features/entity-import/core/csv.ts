import Papa, { type ParseResult } from 'papaparse';

import type {
  IImportFieldDefinition,
  TFlatImportValues,
} from '@/features/entity-import/core/contracts';

function normalizeColumnKey(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

const PARSED_EXTRA_FIELD = '__parsed_extra';

function getTemplateFields(fields: Array<IImportFieldDefinition>): Array<IImportFieldDefinition> {
  return fields.filter((field) => field.csv?.include !== false);
}

export function parseCsvFile(file: File): Promise<ParseResult<Record<string, string>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      // Worker mode cannot be combined with transformHeader: functions are not structured-cloneable for postMessage.
      worker: false,
      skipEmptyLines: 'greedy',
      transformHeader: normalizeColumnKey,
      complete(result) {
        resolve(result);
      },
      error(error) {
        reject(error);
      },
    });
  });
}

export function buildTemplateColumns(fields: Array<IImportFieldDefinition>): Array<string> {
  return getTemplateFields(fields).map((field) => field.label);
}

export function importCsvRows({
  fields,
  rows,
}: {
  fields: Array<IImportFieldDefinition>;
  rows: Array<Record<string, unknown>>;
}): {
  rows: Array<TFlatImportValues>;
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
    ) as TFlatImportValues;

    Object.entries(row).forEach(([columnName, value]) => {
      if (columnName === PARSED_EXTRA_FIELD) {
        return;
      }

      const matchedFieldPath = columnToFieldPath.get(normalizeColumnKey(columnName));

      if (!matchedFieldPath) {
        strippedColumns.add(columnName);
        return;
      }

      hydratedRow[matchedFieldPath] = typeof value === 'string' ? value : '';
    });

    return hydratedRow;
  });

  return {
    rows: importedRows,
    strippedColumns: Array.from(strippedColumns),
  };
}
