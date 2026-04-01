import { describe, expect, it } from 'vitest';

import {
  CellStatus,
  createIdleRemoteState,
  DependencyState,
  type IImportCellState,
  type IImportRowState,
  RemoteValidationStatus,
  RowStatus,
} from '@/features/entity-import/core/contracts';
import {
  getCellStatusMessage,
  getTableRowUiStatus,
  shouldDisplayCellStatusBadge,
  TableRowUiStatus,
} from '@/features/entity-import/ui/status';

function createCell(overrides: Partial<IImportCellState> = {}): IImportCellState {
  return {
    fieldPath: 'field',
    rawValue: '',
    displayValue: null,
    parsedValue: '',
    status: CellStatus.Idle,
    issues: [],
    dependencyState: DependencyState.Ready,
    remoteState: createIdleRemoteState(),
    correctionDraft: null,
    ...overrides,
  };
}

function createRow(
  cells: Record<string, IImportCellState>,
  rowStatus: RowStatus = RowStatus.Valid
): IImportRowState {
  return {
    id: 'row-1',
    rowIndex: 0,
    rowStatus,
    cells,
  };
}

describe('entity-import row and cell status', () => {
  it('marks rows green when all cells are valid', () => {
    const row = createRow({
      required: createCell({ rawValue: 'Neuron A', status: CellStatus.Valid }),
      optional: createCell({ rawValue: '', status: CellStatus.Idle }),
    });

    expect(getTableRowUiStatus(row)).toBe(TableRowUiStatus.Ready);
  });

  it('marks rows yellow when any required cell is invalid', () => {
    const row = createRow(
      {
        required: createCell({
          rawValue: '',
          status: CellStatus.Invalid,
          issues: ['Name is required.'],
        }),
        optional: createCell({ rawValue: '', status: CellStatus.Idle }),
      },
      RowStatus.Invalid
    );

    expect(getTableRowUiStatus(row)).toBe(TableRowUiStatus.NeedsAttention);
  });

  it('marks rows blue when required cells are valid and only optional cells need attention', () => {
    const row = createRow({
      required: createCell({ rawValue: 'Neuron A', status: CellStatus.Valid }),
      optional: createCell({
        rawValue: 'Cortex',
        status: CellStatus.Invalid,
        remoteState: {
          status: RemoteValidationStatus.Invalid,
          suggestions: [
            { value: 'ctx-layer-2', label: 'Cortex layer 2' },
            { value: 'ctx-layer-5', label: 'Cortex layer 5' },
          ],
          selectedSuggestion: null,
          message: 'Multiple matches found.',
        },
      }),
    });

    expect(getTableRowUiStatus(row)).toBe(TableRowUiStatus.NeedsSelection);
  });

  it('shows the info badge and a friendly message for ambiguous multi-match cells', () => {
    const cell = createCell({
      rawValue: 'Cortex',
      status: CellStatus.Invalid,
      remoteState: {
        status: RemoteValidationStatus.Invalid,
        suggestions: [
          { value: 'ctx-layer-2', label: 'Cortex layer 2' },
          { value: 'ctx-layer-5', label: 'Cortex layer 5' },
        ],
        selectedSuggestion: null,
        message: 'Multiple matches found.',
      },
    });

    expect(shouldDisplayCellStatusBadge(cell)).toBe(true);
    expect(getCellStatusMessage(cell)).toContain('Use the validator');
  });
});
