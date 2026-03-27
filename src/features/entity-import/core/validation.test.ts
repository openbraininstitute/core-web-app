import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  CellStatus,
  DependencyState,
  type IImportFieldDefinition,
  ImportInputType,
  RemoteValidationStatus,
  RowStatus,
} from './contracts';
import { createImportSessionState, hydrateSessionRows } from './session';
import * as summaryModule from './summary';
import { validateSessionRows } from './validation';

import type { IAdapterFieldDefinition } from './adapter';

const fields: Array<IImportFieldDefinition> = [
  {
    label: 'Name',
    path: 'name',
    required: true,
    inputType: ImportInputType.Text,
  },
  {
    label: 'Species',
    path: 'species',
    required: true,
    inputType: ImportInputType.Select,
  },
  {
    label: 'Brain Region',
    path: 'brainRegion',
    required: true,
    inputType: ImportInputType.RemoteSelect,
    dependencies: ['species'],
  },
];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  species: z.string().min(1, 'Species is required'),
  brainRegion: z.string().min(1, 'Brain region is required'),
});

describe('validateSessionRows', () => {
  it('blocks dependency-based fields until their parent value is resolved', () => {
    const session = createImportSessionState({
      fields,
      rows: [{ name: 'Neuron A', species: '', brainRegion: '' }],
    });

    const next = validateSessionRows({
      session,
      fields,
      schema,
      buildPayload({ values }) {
        return values;
      },
    });

    expect(next.rows[0].cells.species.status).toBe(CellStatus.Invalid);
    expect(next.rows[0].cells.brainRegion.dependencyState).toBe(DependencyState.Blocked);
    expect(next.rows[0].cells.brainRegion.issues).toEqual([
      'Resolve Species before editing Brain Region.',
    ]);
  });

  it('marks the row valid once all required fields satisfy the schema', () => {
    const session = createImportSessionState({
      fields,
      rows: [{ name: 'Neuron A', species: 'Mouse', brainRegion: 'Isocortex' }],
    });

    const next = validateSessionRows({
      session,
      fields,
      schema,
      buildPayload({ values }) {
        return values;
      },
    });

    expect(next.rows[0].rowStatus).toBe(RowStatus.Valid);
    expect(next.summary.canSubmit).toBe(true);
    expect(next.summary.invalidRequiredCellCount).toBe(0);
  });

  it('preserves submit summary semantics while using the shared summary helper once', () => {
    const session = createImportSessionState({
      fields,
      rows: [
        { name: 'Neuron A', species: 'Mouse', brainRegion: 'Isocortex' },
        { name: 'Neuron B', species: '', brainRegion: 'Thalamus' },
      ],
    });
    session.rows[0].cells.brainRegion.remoteState = {
      status: RemoteValidationStatus.Valid,
      suggestions: [],
      selectedSuggestion: null,
      message: null,
    };

    const summarySpy = vi.spyOn(summaryModule, 'summarizeImportRows');

    try {
      const next = validateSessionRows({
        session,
        fields,
        schema,
        buildPayload({ values }) {
          return values;
        },
      });

      expect(next.rows[0].rowStatus).toBe(RowStatus.Valid);
      expect(next.rows[1].rowStatus).toBe(RowStatus.Invalid);
      expect(next.summary).toEqual({
        canSubmit: false,
        invalidRequiredCellCount: 2,
      });
      expect(summarySpy).toHaveBeenCalledTimes(1);
    } finally {
      summarySpy.mockRestore();
    }
  });

  it('merges field-local validation issues for hydrated compound csv cells', () => {
    const compoundFields: Array<IAdapterFieldDefinition> = [
      {
        label: 'Location',
        path: 'location',
        required: false,
        inputType: ImportInputType.Compound,
        getValidationIssues: ({ cell }) =>
          cell.rawValue.trim() !== '' && !cell.parsedValue ? ['Location tuple is invalid.'] : [],
      },
    ];

    const session = hydrateSessionRows(
      createImportSessionState({
        fields: compoundFields,
        rows: [{ location: '' }],
      }),
      {
        rows: [
          {
            location: {
              rawValue: '(1, 2)',
              parsedValue: null,
            },
          },
        ],
        strippedColumns: [],
      }
    );

    const next = validateSessionRows({
      session,
      fields: compoundFields,
      schema: z.object({
        location: z.string(),
      }),
      buildPayload({ values }) {
        return values;
      },
    });

    expect(next.rows[0].cells.location.status).toBe(CellStatus.Invalid);
    expect(next.rows[0].cells.location.issues).toContain('Location tuple is invalid.');
  });

  it('supports row-targeted validation without recreating untouched rows', () => {
    const session = createImportSessionState({
      fields,
      rows: [
        { name: 'Neuron A', species: 'Mouse', brainRegion: 'Isocortex' },
        { name: '', species: 'Mouse', brainRegion: 'Thalamus' },
      ],
    });

    const next = validateSessionRows({
      session,
      fields,
      schema,
      rowIds: [session.rows[1].id],
      buildPayload({ values }) {
        return values;
      },
    });

    expect(next.rows[0]).toBe(session.rows[0]);
    expect(next.rows[1]).not.toBe(session.rows[1]);
    expect(next.rows[1].cells.name.status).toBe(CellStatus.Invalid);
    expect(next.summary.invalidRequiredCellCount).toBeGreaterThan(0);
  });
});
