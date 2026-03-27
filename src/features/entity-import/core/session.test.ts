import { describe, expect, it, vi } from 'vitest';

import {
  ENTITY_IMPORT_ALL_COLUMNS,
  type IImportFieldDefinition,
  ImportInputType,
  type ISuggestion,
  RemoteValidationStatus,
} from './contracts';
import {
  acceptCorrectionDraft,
  appendEmptyRow,
  clearRow,
  createImportSessionState,
  deleteRow,
  hydrateSessionRows,
  rejectCorrectionDraft,
  selectCell,
  setCellRemoteState,
  setCellValue,
  setValidatorSelection,
  stageSuggestionToRows,
  updateCellRawValue,
} from './session';
import * as summaryModule from './summary';

const fields: Array<IImportFieldDefinition> = [
  {
    label: 'Name',
    path: 'name',
    required: true,
    inputType: ImportInputType.Text,
  },
  {
    label: 'Brain Region',
    path: 'brainRegion',
    required: true,
    inputType: ImportInputType.RemoteSelect,
  },
];

const suggestion: ISuggestion = {
  value: 'brain-region-1',
  label: 'Isocortex',
};

describe('createImportSessionState', () => {
  it('creates schema-shaped empty rows for manual entry', () => {
    const session = createImportSessionState({ fields, rowCount: 2 });

    expect(session.rows).toHaveLength(2);
    expect(Object.keys(session.rows[0].cells)).toEqual(['name', 'brainRegion']);
    expect(session.rows[0].cells.name.rawValue).toBe('');
    expect(session.rows[0].cells.name.correctionDraft).toBeNull();
  });
});

describe('appendEmptyRow', () => {
  it('adds a blank row while preserving the session field shape', () => {
    const session = createImportSessionState({ fields, rowCount: 1 });

    const next = appendEmptyRow(session);

    expect(next.rows).toHaveLength(2);
    expect(next.rows[1].cells.name.rawValue).toBe('');
    expect(next.rows[1].cells.brainRegion.rawValue).toBe('');
  });

  it('keeps session summary correct through the shared summary helper', () => {
    const session = createImportSessionState({
      fields,
      rows: [{ name: 'Neuron A', brainRegion: 'Isocortex' }],
    });

    const summarySpy = vi.spyOn(summaryModule, 'summarizeImportRows');

    try {
      const next = appendEmptyRow(session);

      expect(next.summary).toEqual({
        canSubmit: false,
        invalidRequiredCellCount: 2,
      });
      expect(summarySpy).toHaveBeenCalledTimes(1);
    } finally {
      summarySpy.mockRestore();
    }
  });
});

describe('clearRow', () => {
  it('resets a row back to the provided default values while preserving row identity', () => {
    const session = createImportSessionState({
      fields,
      rows: [{ name: 'Neuron A', brainRegion: 'Ctx' }],
    });

    const next = clearRow(session, {
      rowId: session.rows[0].id,
      values: {
        name: '',
        brainRegion: 'default-brain-region',
      },
    });

    expect(next.rows[0]?.id).toBe(session.rows[0]?.id);
    expect(next.rows[0]?.rowIndex).toBe(0);
    expect(next.rows[0]?.cells.name.rawValue).toBe('');
    expect(next.rows[0]?.cells.brainRegion.rawValue).toBe('default-brain-region');
    expect(next.rows[0]?.cells.brainRegion.displayValue).toBe('default-brain-region');
  });
});

describe('deleteRow', () => {
  it('removes a row, reindexes the table, and clears selection when no rows remain', () => {
    const session = createImportSessionState({
      fields,
      rows: [
        { name: 'Neuron A', brainRegion: 'Ctx' },
        { name: 'Neuron B', brainRegion: 'Thalamus' },
      ],
    });

    const selectedSession = selectCell(session, {
      rowId: session.rows[0]?.id ?? '',
      fieldPath: 'brainRegion',
    });
    const next = deleteRow(selectedSession, {
      rowId: selectedSession.rows[0]?.id ?? '',
    });

    expect(next.rows).toHaveLength(1);
    expect(next.rows[0]?.cells.name.rawValue).toBe('Neuron B');
    expect(next.rows[0]?.rowIndex).toBe(0);
    expect(next.validatorSelection).toEqual({
      rowId: next.rows[0]?.id ?? null,
      fieldPath: 'brainRegion',
    });
    expect(next.selectedCell).toEqual({
      rowId: next.rows[0]?.id ?? '',
      fieldPath: 'brainRegion',
    });

    const empty = deleteRow(next, { rowId: next.rows[0]?.id ?? '' });
    expect(empty.rows).toHaveLength(0);
    expect(empty.validatorSelection).toEqual({
      rowId: null,
      fieldPath: null,
    });
    expect(empty.selectedCell).toBeNull();
  });
});

describe('selectCell', () => {
  it('tracks the currently focused row and field for the validator panel', () => {
    const session = createImportSessionState({ fields, rowCount: 1 });

    const next = selectCell(session, {
      rowId: session.rows[0].id,
      fieldPath: 'brainRegion',
    });

    expect(next.selectedCell).toEqual({
      rowId: session.rows[0].id,
      fieldPath: 'brainRegion',
    });
    expect(next.validatorSelection).toEqual({
      rowId: session.rows[0].id,
      fieldPath: 'brainRegion',
    });
  });
});

describe('setValidatorSelection', () => {
  it('supports row-only and all-column validator selection without forcing a table cell highlight', () => {
    const session = createImportSessionState({ fields, rowCount: 1 });

    const withAllColumns = setValidatorSelection(session, {
      fieldPath: ENTITY_IMPORT_ALL_COLUMNS,
    });
    expect(withAllColumns.validatorSelection).toEqual({
      rowId: null,
      fieldPath: ENTITY_IMPORT_ALL_COLUMNS,
    });
    expect(withAllColumns.selectedCell).toBeNull();

    const withRow = setValidatorSelection(withAllColumns, {
      rowId: session.rows[0].id,
    });
    expect(withRow.validatorSelection).toEqual({
      rowId: session.rows[0].id,
      fieldPath: ENTITY_IMPORT_ALL_COLUMNS,
    });
    expect(withRow.selectedCell).toBeNull();

    const withConcreteCell = setValidatorSelection(withRow, {
      fieldPath: 'brainRegion',
    });
    expect(withConcreteCell.validatorSelection).toEqual({
      rowId: session.rows[0].id,
      fieldPath: 'brainRegion',
    });
    expect(withConcreteCell.selectedCell).toEqual({
      rowId: session.rows[0].id,
      fieldPath: 'brainRegion',
    });
  });
});

describe('updateCellRawValue', () => {
  it('resets stale remote validation state when the raw value changes', () => {
    const session = createImportSessionState({ fields, rowCount: 1 });
    session.rows[0].cells.brainRegion.remoteState = {
      status: RemoteValidationStatus.Invalid,
      suggestions: [suggestion],
      selectedSuggestion: suggestion,
      message: 'Unknown region',
    };

    const next = updateCellRawValue(session, {
      rowId: session.rows[0].id,
      fieldPath: 'brainRegion',
      rawValue: 'Cortex',
    });

    expect(next.rows[0].cells.brainRegion.rawValue).toBe('Cortex');
    expect(next.rows[0].cells.brainRegion.remoteState).toEqual({
      status: RemoteValidationStatus.Idle,
      suggestions: [],
      selectedSuggestion: null,
      message: null,
    });
  });

  it('preserves untouched row references when updating a single cell', () => {
    const session = createImportSessionState({
      fields,
      rows: [
        { name: 'Neuron A', brainRegion: 'Ctx' },
        { name: 'Neuron B', brainRegion: 'Thalamus' },
      ],
    });

    const next = setCellValue(session, {
      rowId: session.rows[1].id,
      fieldPath: 'brainRegion',
      rawValue: 'Isocortex',
    });

    expect(next.rows[0]).toBe(session.rows[0]);
    expect(next.rows[1]).not.toBe(session.rows[1]);
    expect(next.rows[1].cells.brainRegion.rawValue).toBe('Isocortex');
  });

  it('preserves untouched row references when updating remote state', () => {
    const session = createImportSessionState({
      fields,
      rows: [
        { name: 'Neuron A', brainRegion: 'Ctx' },
        { name: 'Neuron B', brainRegion: 'Thalamus' },
      ],
    });

    const next = setCellRemoteState(session, {
      rowId: session.rows[1].id,
      fieldPath: 'brainRegion',
      remoteState: {
        status: RemoteValidationStatus.Pending,
        suggestions: [],
        selectedSuggestion: null,
        message: null,
      },
    });

    expect(next.rows[0]).toBe(session.rows[0]);
    expect(next.rows[1]).not.toBe(session.rows[1]);
    expect(next.rows[1].cells.brainRegion.remoteState.status).toBe(RemoteValidationStatus.Pending);
  });
});

describe('stageSuggestionToRows', () => {
  it('stages a suggestion without mutating the raw value immediately', () => {
    const session = createImportSessionState({
      fields,
      rows: [
        { name: 'Neuron A', brainRegion: 'Ctx' },
        { name: 'Neuron B', brainRegion: 'Ctx' },
        { name: 'Neuron C', brainRegion: 'Thalamus' },
      ],
    });

    const next = stageSuggestionToRows(session, {
      fieldPath: 'brainRegion',
      targetRowId: session.rows[0].id,
      sourceValue: 'Ctx',
      suggestion,
      applyToAllMatching: true,
    });

    expect(next.rows.map((row) => row.cells.brainRegion.rawValue)).toEqual([
      'Ctx',
      'Ctx',
      'Thalamus',
    ]);
    expect(next.rows[0].cells.brainRegion.correctionDraft).toMatchObject({
      previousRawValue: 'Ctx',
      previousDisplayValue: 'Ctx',
      previousParsedValue: 'Ctx',
      suggestion,
    });
    expect(next.rows[1].cells.brainRegion.correctionDraft).toMatchObject({
      previousRawValue: 'Ctx',
      previousDisplayValue: 'Ctx',
      previousParsedValue: 'Ctx',
      suggestion,
    });
    expect(next.rows[2].cells.brainRegion.correctionDraft).toMatchObject({
      previousRawValue: 'Thalamus',
      previousDisplayValue: 'Thalamus',
      previousParsedValue: 'Thalamus',
      suggestion,
    });
  });
});

describe('acceptCorrectionDraft', () => {
  it('commits the staged suggestion into the cell value', () => {
    const session = createImportSessionState({
      fields,
      rows: [{ name: 'Neuron A', brainRegion: 'Ctx' }],
    });

    const staged = stageSuggestionToRows(session, {
      fieldPath: 'brainRegion',
      targetRowId: session.rows[0].id,
      sourceValue: 'Ctx',
      suggestion,
      applyToAllMatching: false,
    });

    const next = acceptCorrectionDraft(staged, {
      rowId: staged.rows[0].id,
      fieldPath: 'brainRegion',
    });

    expect(next.rows[0].cells.brainRegion.rawValue).toBe('Isocortex');
    expect(next.rows[0].cells.brainRegion.displayValue).toBe('Isocortex');
    expect(next.rows[0].cells.brainRegion.parsedValue).toBe('brain-region-1');
    expect(next.rows[0].cells.brainRegion.correctionDraft).toBeNull();
    expect(next.rows[0].cells.brainRegion.remoteState.status).toBe(RemoteValidationStatus.Valid);
  });
});

describe('rejectCorrectionDraft', () => {
  it('clears the draft and keeps the original cell value', () => {
    const session = createImportSessionState({
      fields,
      rows: [{ name: 'Neuron A', brainRegion: 'Ctx' }],
    });

    const staged = stageSuggestionToRows(session, {
      fieldPath: 'brainRegion',
      targetRowId: session.rows[0].id,
      sourceValue: 'Ctx',
      suggestion,
      applyToAllMatching: false,
    });

    const next = rejectCorrectionDraft(staged, {
      rowId: staged.rows[0].id,
      fieldPath: 'brainRegion',
    });

    expect(next.rows[0].cells.brainRegion.rawValue).toBe('Ctx');
    expect(next.rows[0].cells.brainRegion.displayValue).toBe('Ctx');
    expect(next.rows[0].cells.brainRegion.correctionDraft).toBeNull();
  });

  it('restores the previous resolved id when rejecting a staged suggestion', () => {
    const session = createImportSessionState({
      fields,
      rows: [{ name: 'Neuron A', brainRegion: 'Isocortex' }],
    });

    const resolved = setCellValue(session, {
      rowId: session.rows[0].id,
      fieldPath: 'brainRegion',
      rawValue: 'Isocortex',
      displayValue: 'Isocortex',
      parsedValue: 'brain-region-1',
    });

    const staged = stageSuggestionToRows(resolved, {
      fieldPath: 'brainRegion',
      targetRowId: resolved.rows[0].id,
      sourceValue: 'Isocortex',
      suggestion: {
        value: 'brain-region-2',
        label: 'Thalamus',
      },
      applyToAllMatching: false,
    });

    const next = rejectCorrectionDraft(staged, {
      rowId: staged.rows[0].id,
      fieldPath: 'brainRegion',
    });

    expect(next.rows[0].cells.brainRegion.rawValue).toBe('Isocortex');
    expect(next.rows[0].cells.brainRegion.displayValue).toBe('Isocortex');
    expect(next.rows[0].cells.brainRegion.parsedValue).toBe('brain-region-1');
    expect(next.rows[0].cells.brainRegion.correctionDraft).toBeNull();
  });
});

describe('hydrateSessionRows', () => {
  it('replaces rows and pushes a stripped-column notification after csv import', () => {
    const session = createImportSessionState({ fields, rowCount: 1 });

    const next = hydrateSessionRows(session, {
      rows: [
        {
          name: 'Neuron A',
          brainRegion: 'Ctx',
        },
      ],
      strippedColumns: ['IgnoreMe'],
    });

    expect(next.rows).toHaveLength(1);
    expect(next.rows[0].cells.name.rawValue).toBe('Neuron A');
    expect(next.notifications[0]?.message).toContain('IgnoreMe');
  });

  it('hydrates imported cells with typed parsed values and display labels', () => {
    const session = createImportSessionState({ fields, rowCount: 1 });

    const next = hydrateSessionRows(session, {
      rows: [
        {
          name: {
            rawValue: 'Neuron A',
            displayValue: 'Neuron Alpha',
            parsedValue: { canonical: 'neuron-a' },
          },
          brainRegion: 'Ctx',
        },
      ],
      strippedColumns: [],
    });

    expect(next.rows[0].cells.name.rawValue).toBe('Neuron A');
    expect(next.rows[0].cells.name.displayValue).toBe('Neuron Alpha');
    expect(next.rows[0].cells.name.parsedValue).toEqual({ canonical: 'neuron-a' });
    expect(next.rows[0].cells.brainRegion.rawValue).toBe('Ctx');
  });
});
