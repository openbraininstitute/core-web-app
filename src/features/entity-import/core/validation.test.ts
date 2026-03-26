import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  CellStatus,
  DependencyState,
  type IImportFieldDefinition,
  ImportInputType,
  RowStatus,
} from './contracts';
import { createImportSessionState, hydrateSessionRows } from './session';
import { validateSessionRows } from './validation';

import type { AdapterFieldDefinition } from './adapter';

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

  it('merges field-local validation issues for hydrated compound csv cells', () => {
    const compoundFields: Array<AdapterFieldDefinition> = [
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
});
