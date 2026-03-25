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

import type { EntityImportActions } from '../../core/adapter';
import type { ImportCellState, ImportRowState } from '../../core/contracts';

function createMockActions(): EntityImportActions {
  return {
    addRow: vi.fn(),
    acceptCorrection: vi.fn(),
    applySuggestion: vi.fn(),
    chooseSuggestion: vi.fn(),
    dismissNotification: vi.fn(),
    rejectCorrection: vi.fn(),
    requestSuggestions: vi.fn(async () => {}),
    loadMoreSuggestions: vi.fn(),
    selectCell: vi.fn(),
    setCustomValue: vi.fn(),
    setFileValue: vi.fn(),
    submitRows: vi.fn(),
    updateCellValue: vi.fn(),
  };
}

function createLocationCell(parsedValue: unknown = null, rawValue = ''): ImportCellState {
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

function createRow(cell: ImportCellState): ImportRowState {
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
  onSetCustomValue: ReturnType<typeof vi.fn>;
}) {
  const [cell, setCell] = useState<ImportCellState>(() => createLocationCell());
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
    } satisfies EntityImportActions;
  }, [onSetCustomValue]);

  return (
    <LocationEditor cell={cell} row={row} fieldPath="location" actions={actions} mode="table" />
  );
}

function PanelLocationHarness({ onChange }: { onChange: ReturnType<typeof vi.fn> }) {
  const actions = createMockActions();
  const [value, setValue] = useState({ x: 1, y: 2, z: 3 });
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

    expect(xInput).toHaveValue(10);
    expect(setCustomValueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        fieldPath: 'location',
        parsedValue: { x: 10, y: null, z: null },
      })
    );
  });

  it('supports controlled panel editing without mutating session state directly', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<PanelLocationHarness onChange={onChange} />);

    expect(screen.getByTestId('location-editor-panel')).toHaveClass('grid', 'grid-cols-3');

    const yInput = screen.getByLabelText('Location Y row 1');
    await user.clear(yInput);
    await user.type(yInput, '9');

    expect(yInput).toHaveValue(9);
    expect(onChange).toHaveBeenLastCalledWith({ x: 1, y: 9, z: 3 });
  });
});
