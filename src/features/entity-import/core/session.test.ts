import { describe, expect, it } from 'vitest';

import {
  type ImportFieldDefinition,
  ImportInputType,
  type ISuggestion,
  RemoteValidationStatus,
} from './contracts';
import {
  acceptCorrectionDraft,
  appendEmptyRow,
  createImportSessionState,
  hydrateSessionRows,
  rejectCorrectionDraft,
  selectCell,
  stageSuggestionToRows,
  updateCellRawValue,
} from './session';

const fields: Array<ImportFieldDefinition> = [
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
  value: 'isocortex',
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
    expect(next.rows[0].cells.brainRegion.correctionDraft).toEqual({
      previousRawValue: 'Ctx',
      previousDisplayValue: 'Ctx',
      suggestion,
    });
    expect(next.rows[1].cells.brainRegion.correctionDraft).toEqual({
      previousRawValue: 'Ctx',
      previousDisplayValue: 'Ctx',
      suggestion,
    });
    expect(next.rows[2].cells.brainRegion.correctionDraft).toEqual({
      previousRawValue: 'Thalamus',
      previousDisplayValue: 'Thalamus',
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

    expect(next.rows[0].cells.brainRegion.rawValue).toBe('isocortex');
    expect(next.rows[0].cells.brainRegion.displayValue).toBe('Isocortex');
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
});
