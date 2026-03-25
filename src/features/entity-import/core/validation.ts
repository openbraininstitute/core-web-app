import {
  CellStatus,
  DependencyState,
  type FlatImportValues,
  type ImportRowState,
  type ImportSessionState,
  RemoteValidationStatus,
  RowStatus,
} from './contracts';

import type { ZodType } from 'zod';
import type { AdapterFieldDefinition } from './adapter';

function cloneRows(rows: Array<ImportRowState>): Array<ImportRowState> {
  return rows.map((row) => ({
    ...row,
    cells: Object.fromEntries(
      Object.entries(row.cells).map(([key, cell]) => [
        key,
        {
          ...cell,
          issues: [...cell.issues],
          remoteState: {
            ...cell.remoteState,
            suggestions: [...cell.remoteState.suggestions],
            suggestionPaging: cell.remoteState.suggestionPaging
              ? { ...cell.remoteState.suggestionPaging }
              : undefined,
          },
          correctionDraft: cell.correctionDraft
            ? { ...cell.correctionDraft, suggestion: { ...cell.correctionDraft.suggestion } }
            : null,
        },
      ])
    ),
  }));
}

function labelForPath(fields: Array<AdapterFieldDefinition>, path: string): string {
  return fields.find((field) => field.path === path)?.label ?? path;
}

function resolveIssueFieldPath(fields: Array<AdapterFieldDefinition>, issuePath: string): string {
  const matchingField = fields.find((field) => {
    const validationPath = field.validationPath ?? field.path;
    return issuePath === validationPath || issuePath.startsWith(`${validationPath}.`);
  });

  return matchingField?.path ?? issuePath;
}

function valuesFromRow(row: ImportRowState): FlatImportValues {
  return Object.fromEntries(Object.entries(row.cells).map(([key, cell]) => [key, cell.rawValue]));
}

function summarize(
  rows: Array<ImportRowState>,
  fields: Array<AdapterFieldDefinition>
): ImportSessionState['summary'] {
  let invalidRequiredCellCount = 0;

  rows.forEach((row) => {
    fields.forEach((field) => {
      const cell = row.cells[field.path];
      const isRequiredInvalid =
        field.required &&
        (cell.rawValue.trim() === '' ||
          cell.status === CellStatus.Invalid ||
          cell.status === CellStatus.Disabled ||
          cell.remoteState.status === RemoteValidationStatus.Invalid ||
          cell.remoteState.status === RemoteValidationStatus.Pending);

      if (isRequiredInvalid) {
        invalidRequiredCellCount += 1;
      }
    });
  });

  return {
    canSubmit: rows.length > 0 && invalidRequiredCellCount === 0,
    invalidRequiredCellCount,
  };
}

export function validateSessionRows<TPayload>({
  session,
  fields,
  schema,
  buildPayload,
}: {
  session: ImportSessionState;
  fields: Array<AdapterFieldDefinition>;
  schema: ZodType<TPayload>;
  buildPayload: (args: { row: ImportRowState; values: FlatImportValues }) => TPayload;
}): ImportSessionState {
  const nextRows = cloneRows(session.rows).map((row) => {
    const rowValues = valuesFromRow(row);
    const issueMap = new Map<string, Array<string>>();

    const parseResult = schema.safeParse(
      buildPayload({
        row,
        values: rowValues,
      })
    );
    if (!parseResult.success) {
      parseResult.error.issues.forEach((issue) => {
        const key = resolveIssueFieldPath(fields, issue.path.join('.') || '_row');
        const existing = issueMap.get(key) ?? [];
        issueMap.set(key, [...existing, issue.message]);
      });
    }

    fields.forEach((field) => {
      const cell = row.cells[field.path];
      const isExplicitlyEnabled = field.isEnabled?.(rowValues) ?? true;
      const blockingDependency = field.dependencies?.find((dependencyPath) => {
        const dependencyCell = row.cells[dependencyPath];
        return !dependencyCell || dependencyCell.rawValue.trim() === '';
      });

      if (blockingDependency || !isExplicitlyEnabled) {
        const blockingPath = blockingDependency ?? field.dependencies?.[0] ?? field.path;
        const disabledMessage =
          field.getDisabledMessage?.(rowValues) ??
          `Resolve ${labelForPath(fields, blockingPath)} before editing ${field.label}.`;
        row.cells[field.path] = {
          ...cell,
          status: CellStatus.Disabled,
          dependencyState: DependencyState.Blocked,
          issues: [disabledMessage],
        };
        return;
      }

      const issues = issueMap.get(field.path) ?? [];
      const remoteIssues =
        cell.remoteState.status === RemoteValidationStatus.Invalid && cell.remoteState.message
          ? [cell.remoteState.message]
          : [];
      const combinedIssues = [...issues, ...remoteIssues];
      const hasRawValue = cell.rawValue.trim() !== '';
      const needsRemoteConfirmation =
        !cell.correctionDraft &&
        (!!field.remote?.search || !!field.remote?.validate) &&
        hasRawValue &&
        cell.remoteState.status !== RemoteValidationStatus.Valid &&
        combinedIssues.length === 0;
      const needsRemoteIssue = needsRemoteConfirmation
        ? [`Confirm ${field.label} from the suggestion list before importing.`]
        : [];
      const stagedIssues = cell.correctionDraft
        ? ['Accept or reject the suggested correction in the table before importing.']
        : [];
      const finalIssues = [...combinedIssues, ...needsRemoteIssue, ...stagedIssues];

      row.cells[field.path] = {
        ...cell,
        dependencyState: DependencyState.Ready,
        issues: finalIssues,
        status:
          finalIssues.length > 0
            ? CellStatus.Invalid
            : hasRawValue
              ? CellStatus.Valid
              : CellStatus.Idle,
      };
    });

    row.rowStatus = fields.every((field) => {
      if (!field.required) {
        return true;
      }

      const cell = row.cells[field.path];
      return cell.status === CellStatus.Valid;
    })
      ? RowStatus.Valid
      : RowStatus.Invalid;

    return row;
  });

  return {
    ...session,
    rows: nextRows,
    summary: summarize(nextRows, fields),
  };
}
