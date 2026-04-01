import {
  CellStatus,
  DependencyState,
  type IImportRowState,
  type IImportSessionState,
  RemoteValidationStatus,
  RowStatus,
  type TFlatImportValues,
} from '@/features/entity-import/core/contracts';
import { replaceSessionRows } from '@/features/entity-import/core/session';
import {
  fieldHasSuggestionResolution,
  getRowSubmissionValues,
} from '@/features/entity-import/core/shared/helpers';
import * as summaryModule from '@/features/entity-import/core/summary';

import type { ZodType } from 'zod';
import type { IAdapterFieldDefinition } from '@/features/entity-import/core/adapter';

function arrayEquals(left: Array<string>, right: Array<string>): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function maybeReuseValidatedCell(
  currentCell: IImportRowState['cells'][string],
  candidate: IImportRowState['cells'][string]
) {
  if (
    currentCell.status === candidate.status &&
    currentCell.dependencyState === candidate.dependencyState &&
    arrayEquals(currentCell.issues, candidate.issues)
  ) {
    return currentCell;
  }

  return candidate;
}

function validateRow<TPayload>({
  row,
  fields,
  schema,
  buildPayload,
}: {
  row: IImportRowState;
  fields: Array<IAdapterFieldDefinition>;
  schema: ZodType<TPayload>;
  buildPayload: (args: { row: IImportRowState; values: TFlatImportValues }) => TPayload;
}): IImportRowState {
  const rowValues = getRowSubmissionValues(row);
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

  let didChangeCells = false;
  let nextCells = row.cells;

  fields.forEach((field) => {
    const cell = row.cells[field.path];
    const enablementArgs = {
      values: rowValues,
      row,
    };
    const isExplicitlyEnabled = field.isEnabled?.(enablementArgs) ?? true;
    const blockingDependency = field.dependencies?.find((dependencyPath) => {
      const dependencyCell = row.cells[dependencyPath];
      return !dependencyCell || dependencyCell.rawValue.trim() === '';
    });

    const candidateCell = (() => {
      if (blockingDependency || !isExplicitlyEnabled) {
        const blockingPath = blockingDependency ?? field.dependencies?.[0] ?? field.path;
        const customDisabledMessage = !blockingDependency
          ? field.getDisabledMessage?.(enablementArgs)
          : null;
        const disabledMessage =
          customDisabledMessage ??
          `Resolve ${labelForPath(fields, blockingPath)} before editing ${field.label}.`;

        return {
          ...cell,
          status: CellStatus.Disabled,
          dependencyState: DependencyState.Blocked,
          issues: [disabledMessage],
        };
      }

      const issues = issueMap.get(field.path) ?? [];
      const localIssues =
        field.getValidationIssues?.({
          cell,
          row,
          values: rowValues,
        }) ?? [];
      const remoteIssues =
        cell.remoteState.status === RemoteValidationStatus.Invalid && cell.remoteState.message
          ? [cell.remoteState.message]
          : [];
      const combinedIssues = [...issues, ...localIssues, ...remoteIssues];
      const hasRawValue = cell.rawValue.trim() !== '';
      const needsRemoteConfirmation =
        !cell.correctionDraft &&
        fieldHasSuggestionResolution(field) &&
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

      return {
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
    })();

    const nextCell = maybeReuseValidatedCell(cell, candidateCell);
    if (nextCell === cell) {
      return;
    }

    if (!didChangeCells) {
      nextCells = { ...row.cells };
      didChangeCells = true;
    }
    nextCells[field.path] = nextCell;
  });

  const validatedCells = didChangeCells ? nextCells : row.cells;
  const nextRowStatus = fields.every((field) => {
    if (!field.required) {
      return true;
    }

    const cell = validatedCells[field.path];
    return cell.status === CellStatus.Valid;
  })
    ? RowStatus.Valid
    : RowStatus.Invalid;

  if (!didChangeCells && nextRowStatus === row.rowStatus) {
    return row;
  }

  return {
    ...row,
    rowStatus: nextRowStatus,
    cells: validatedCells,
  };
}

function labelForPath(fields: Array<IAdapterFieldDefinition>, path: string): string {
  return fields.find((field) => field.path === path)?.label ?? path;
}

function resolveIssueFieldPath(fields: Array<IAdapterFieldDefinition>, issuePath: string): string {
  const matchingField = fields.find((field) => {
    const validationPath = field.validationPath ?? field.path;
    return issuePath === validationPath || issuePath.startsWith(`${validationPath}.`);
  });

  return matchingField?.path ?? issuePath;
}

export function validateSessionRows<TPayload>({
  session,
  fields,
  schema,
  rowIds,
  buildPayload,
}: {
  session: IImportSessionState;
  fields: Array<IAdapterFieldDefinition>;
  schema: ZodType<TPayload>;
  rowIds?: Array<string>;
  buildPayload: (args: { row: IImportRowState; values: TFlatImportValues }) => TPayload;
}): IImportSessionState {
  const rowIdSet = rowIds?.length ? new Set(rowIds) : null;
  let didChange = false;
  const nextRows = session.rows.map((row) => {
    if (rowIdSet && !rowIdSet.has(row.id)) {
      return row;
    }

    const nextRow = validateRow({
      row,
      fields,
      schema,
      buildPayload,
    });
    didChange ||= nextRow !== row;
    return nextRow;
  });

  const resolvedRows = didChange ? nextRows : session.rows;

  // Use incremental summary when we know exactly which rows changed.
  const summary =
    rowIdSet && didChange
      ? summaryModule.summarizeImportRowsIncremental(
          session.rows,
          resolvedRows,
          fields,
          session.summary,
          rowIdSet
        )
      : summaryModule.summarizeImportRows(resolvedRows, fields);

  return replaceSessionRows(session, resolvedRows, { summary });
}
