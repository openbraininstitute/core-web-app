import {
  CellStatus,
  type IImportFieldDefinition,
  type IImportRowState,
  type IImportSessionState,
  RemoteValidationStatus,
} from '@/features/entity-import/core/contracts';

export function summarizeImportRows(
  rows: Array<IImportRowState>,
  fields: Array<IImportFieldDefinition>
): IImportSessionState['summary'] {
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
