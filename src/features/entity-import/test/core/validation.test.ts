import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  CellStatus,
  DependencyState,
  type IImportFieldDefinition,
  ImportInputType,
  RemoteValidationStatus,
  RowStatus,
} from '@/features/entity-import/core/contracts';
import {
  createImportSessionState,
  hydrateSessionRows,
  resolveCellSuggestion,
  setCellValue,
} from '@/features/entity-import/core/session';
import * as summaryModule from '@/features/entity-import/core/summary';
import { validateSessionRows } from '@/features/entity-import/core/validation';
import { createCellMorphologyImportAdapter } from '@/ui/segments/contribute/multiple/adapters/cell-morphology/adapter';

import type { IAdapterFieldDefinition } from '@/features/entity-import/core/adapter';

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

  it('marks subject and brain region invalid when they resolve to different species', () => {
    const adapter = createCellMorphologyImportAdapter({});
    const session = createImportSessionState({
      fields: adapter.fields,
      rows: [adapter.createBlankRow?.() ?? {}],
    });
    const rowId = session.rows[0].id;
    const withName = setCellValue(session, {
      rowId,
      fieldPath: 'name',
      rawValue: 'Neuron A',
      displayValue: 'Neuron A',
      parsedValue: 'Neuron A',
    });
    const withDescription = setCellValue(withName, {
      rowId,
      fieldPath: 'description',
      rawValue: 'A morphology',
      displayValue: 'A morphology',
      parsedValue: 'A morphology',
    });
    const withSourceFile = setCellValue(withDescription, {
      rowId,
      fieldPath: 'sourceFile',
      rawValue: 'cell.swc',
      displayValue: 'cell.swc',
      parsedValue: new File(['swc'], 'cell.swc', { type: 'application/swc' }),
    });
    const withLicense = resolveCellSuggestion(withSourceFile, {
      rowId,
      fieldPath: 'licenseId',
      suggestion: {
        value: '11111111-1111-4111-8111-111111111111',
        label: 'License A',
      },
    });
    const withProtocol = resolveCellSuggestion(withLicense, {
      rowId,
      fieldPath: 'protocolId',
      suggestion: {
        value: '22222222-2222-4222-8222-222222222222',
        label: 'Protocol A',
      },
    });
    const withMtype = resolveCellSuggestion(withProtocol, {
      rowId,
      fieldPath: 'mtypeClassId',
      suggestion: {
        value: '33333333-3333-4333-8333-333333333333',
        label: 'M-Type A',
      },
    });
    const withContributions = setCellValue(withMtype, {
      rowId,
      fieldPath: 'contributions',
      rawValue: '1 contributor',
      displayValue: '1 contributor',
      parsedValue: [
        {
          agent_type: 'person',
          agent_id: '44444444-4444-4444-8444-444444444444',
          role_id: '55555555-5555-4555-8555-555555555555',
        },
      ],
    });
    const withBrainRegion = resolveCellSuggestion(withContributions, {
      rowId,
      fieldPath: 'brainRegionId',
      suggestion: {
        value: '66666666-6666-4666-8666-666666666666',
        label: 'Isocortex',
        metadata: {
          species: 'Mouse',
          speciesId: 'species-mouse',
        },
      },
    });
    const withSubject = resolveCellSuggestion(withBrainRegion, {
      rowId,
      fieldPath: 'subjectId',
      suggestion: {
        value: '77777777-7777-4777-8777-777777777777',
        label: 'Rat Subject 1',
        metadata: {
          species: 'Rat',
          speciesId: 'species-rat',
        },
      },
    });

    const next = validateSessionRows({
      session: withSubject,
      fields: adapter.fields,
      schema: adapter.schema,
      buildPayload({ row, values }) {
        return adapter.buildPayload({
          row,
          values,
          context: { projectId: 'project-1', virtualLabId: 'lab-1' },
        });
      },
    });

    expect(next.rows[0].cells.brainRegionId.issues).toContain(
      'Brain Region and Subject must belong to the same species.'
    );
    expect(next.rows[0].cells.subjectId.issues).toContain(
      'Brain Region and Subject must belong to the same species.'
    );
  });
});
