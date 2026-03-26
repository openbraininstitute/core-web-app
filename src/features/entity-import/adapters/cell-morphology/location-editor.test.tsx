import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMemo, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  CellStatus,
  createIdleRemoteState,
  DependencyState,
  RowStatus,
} from '../../core/contracts';
import { LocationEditor, summarizeLocation } from './location-editor';

import type { IEntityImportActions } from '../../core/adapter';
import type { IImportCellState, IImportRowState } from '../../core/contracts';
import type { LocationValue } from './location-editor';

function createMockActions(): IEntityImportActions {
  return {
    addRow: vi.fn(),
    acceptCorrection: vi.fn(),
    applySuggestion: vi.fn(),
    chooseSuggestion: vi.fn(),
    clearRow: vi.fn(),
    deleteRow: vi.fn(),
    dismissNotification: vi.fn(),
    rejectCorrection: vi.fn(),
    requestSuggestions: vi.fn(async () => {}),
    loadMoreSuggestions: vi.fn(),
    selectCell: vi.fn(),
    setValidatorSelection: vi.fn(),
    setCustomValue: vi.fn(),
    setFileValue: vi.fn(),
    submitRows: vi.fn(),
    updateCellValue: vi.fn(),
  };
}

function createLocationCell(parsedValue: unknown = null, rawValue = ''): IImportCellState {
  return {
    fieldPath: 'location',
    rawValue,
    displayValue: null,
    parsedValue,
    status: CellStatus.Idle,
    issues: [],
    dependencyState: DependencyState.Ready,
    remoteState: createIdleRemoteState(),
    correctionDraft: null,
  };
}

function createRow(cell: IImportCellState): IImportRowState {
  return {
    id: 'row-1',
    rowIndex: 0,
    rowStatus: RowStatus.Idle,
    cells: {
      location: cell,
    },
  };
}

function InlineLocationHarness({
  onSetCustomValue,
}: {
  onSetCustomValue: (params: {
    rowId: string;
    fieldPath: string;
    rawValue: string;
    displayValue?: string | null;
    parsedValue?: unknown;
  }) => void;
}) {
  const [cell, setCell] = useState<IImportCellState>(() => createLocationCell());
  const row = useMemo(() => createRow(cell), [cell]);
  const actions = useMemo(() => {
    const baseActions = createMockActions();
    return {
      ...baseActions,
      setCustomValue: (params: {
        rowId: string;
        fieldPath: string;
        rawValue: string;
        displayValue?: string | null;
        parsedValue?: unknown;
      }) => {
        onSetCustomValue(params);
        setCell((current) => ({
          ...current,
          rawValue: params.rawValue,
          displayValue: params.displayValue ?? null,
          parsedValue: params.parsedValue ?? params.rawValue,
        }));
      },
    } satisfies IEntityImportActions;
  }, [onSetCustomValue]);

  return (
    <LocationEditor cell={cell} row={row} fieldPath="location" actions={actions} mode="table" />
  );
}

function PanelLocationHarness({ onChange }: { onChange: (value: LocationValue) => void }) {
  const actions = createMockActions();
  const [value, setValue] = useState<LocationValue>({ x: 1, y: 2, z: 3 });
  const cell = createLocationCell(value, summarizeLocation(value));
  const row = createRow(cell);

  return (
    <LocationEditor
      cell={cell}
      row={row}
      fieldPath="location"
      actions={actions}
      mode="panel"
      value={value}
      onChange={(nextValue) => {
        onChange(nextValue);
        setValue(nextValue);
      }}
    />
  );
}

describe('LocationEditor', () => {
  it('fills the table cell and writes inline coordinate edits through import actions', async () => {
    const user = userEvent.setup();
    const setCustomValueSpy = vi.fn();

    render(<InlineLocationHarness onSetCustomValue={setCustomValueSpy} />);

    expect(screen.getByTestId('location-editor-table')).toHaveClass('h-full', 'min-h-[52px]');

    const xInput = screen.getByLabelText('Location X row 1');
    await user.click(xInput);
    await user.clear(xInput);
    await user.type(xInput, '10');

    expect(setCustomValueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        fieldPath: 'location',
      })
    );
  });

  it('supports controlled panel editing without mutating session state directly', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PanelLocationHarness onChange={onChange} />);

    expect(screen.getByTestId('location-editor-panel')).toHaveClass('space-y-3', 'px-4');

    const yInput = screen.getByLabelText('Location Y row 1');
    await user.clear(yInput);
    await user.type(yInput, '9');

    expect(yInput).toHaveValue(9);
    expect(onChange).toHaveBeenLastCalledWith({ x: 1, y: 9, z: 3 });
  });

  it('shows staged values and previous values only in the table cell', () => {
    const actions = createMockActions();
    const cell = createLocationCell({ x: 1, y: 2, z: 3 }, '1, 2, 3');
    cell.correctionDraft = {
      previousRawValue: '1, 2, 3',
      previousDisplayValue: null,
      previousParsedValue: { x: 1, y: 2, z: 3 },
      previousRemoteState: createIdleRemoteState(),
      suggestion: {
        value: '9, 2, 3',
        label: '9, 2, 3',
        metadata: {
          parsedValue: { x: 9, y: 2, z: 3 },
        },
      },
    };
    const row = createRow(cell);

    render(
      <LocationEditor cell={cell} row={row} fieldPath="location" actions={actions} mode="table" />
    );

    expect(screen.getAllByTitle('Original value')).toHaveLength(3);
    expect(screen.getByLabelText('Location X row 1')).toHaveValue(9);
    expect(screen.getByLabelText('Location Y row 1')).toHaveValue(2);
    expect(screen.getByLabelText('Location Z row 1')).toHaveValue(3);
  });

  it('does not render previous values in the panel when the location is staged', () => {
    const actions = createMockActions();
    const cell = createLocationCell({ x: 1, y: 2, z: 3 }, '1, 2, 3');
    cell.correctionDraft = {
      previousRawValue: '1, 2, 3',
      previousDisplayValue: null,
      previousParsedValue: { x: 1, y: 2, z: 3 },
      previousRemoteState: createIdleRemoteState(),
      suggestion: {
        value: '9, 2, 3',
        label: '9, 2, 3',
        metadata: {
          parsedValue: { x: 9, y: 2, z: 3 },
        },
      },
    };
    const row = createRow(cell);

    render(
      <LocationEditor cell={cell} row={row} fieldPath="location" actions={actions} mode="panel" />
    );

    expect(screen.queryByText('Previous X')).not.toBeInTheDocument();
    expect(screen.queryByText('Previous Y')).not.toBeInTheDocument();
    expect(screen.queryByText('Previous Z')).not.toBeInTheDocument();
  });
});
