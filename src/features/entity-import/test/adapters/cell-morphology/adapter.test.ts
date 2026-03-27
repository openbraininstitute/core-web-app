import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { CellMorphologyGenerationType } from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { RepairPipelineState } from '@/api/entitycore/types/shared/protocol';
import { AgentType } from '@/ui/segments/contribute/shared/types';

import {
  type CellMorphologySubmissionPayload,
  createCellMorphologyImportAdapter,
} from '../../../adapters/cell-morphology/adapter';
import { getRowSubmissionValues } from '../../../core/helpers';
import {
  createImportSessionState,
  resolveCellSuggestion,
  setCellValue,
} from '../../../core/session';
import { validateSessionRows } from '../../../core/validation';

import type { IEntityImportPostSubmitActions } from '../../../core/shared/post-submit-actions';

describe('createCellMorphologyImportAdapter', () => {
  it('exposes remote query and evaluate handlers for all remotely resolved fields', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });

    expect(
      adapter.fields
        .filter((field) =>
          ['brainRegionId', 'subjectId', 'licenseId', 'protocolId', 'mtypeClassId'].includes(
            field.path
          )
        )
        .every((field) => {
          const remote = field.remote as Record<string, unknown> | undefined;
          return (
            typeof field.remote?.query === 'function' &&
            typeof field.remote?.evaluate === 'function' &&
            remote?.search === undefined &&
            remote?.searchPage === undefined &&
            remote?.validate === undefined
          );
        })
    ).toBe(true);
  });

  it('uses remote evaluate to distinguish zero, one, and many matches', async () => {
    const queryBrainRegion = vi.fn(
      async ({
        queryField,
        query,
      }: {
        queryField: 'semantic_search' | 'name__ilike';
        query: string;
      }) => {
        if (queryField === 'name__ilike' && query === 'Cerebellu') {
          return {
            suggestions: [{ value: 'brain-region-1', label: 'Cerebellum' }],
            nextPageParam: null,
          };
        }

        if (queryField === 'name__ilike' && query === 'Cortex') {
          return {
            suggestions: [
              { value: 'brain-region-2', label: 'Cortex layer 2' },
              { value: 'brain-region-3', label: 'Cortex layer 5' },
            ],
            nextPageParam: null,
          };
        }

        return {
          suggestions: [],
          nextPageParam: null,
        };
      }
    );
    const services = {
      queryBrainRegion,
      queryLicense: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      querySubject: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryProtocol: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryMtype: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryPerson: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryOrganization: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryConsortium: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryRole: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      registerMorphology: vi.fn(async () => ({ id: 'morphology-1', isValid: true })),
    } as never;
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
      services,
    });
    const session = createImportSessionState({
      fields: adapter.fields,
      rows: [adapter.createBlankRow?.() ?? {}],
    });
    const row = session.rows[0];
    const values = Object.fromEntries(
      Object.entries(row.cells).map(([key, cell]) => [key, cell.rawValue])
    );
    const brainRegionField = adapter.fields.find((field) => field.path === 'brainRegionId');

    await expect(
      brainRegionField?.remote?.evaluate?.({
        query: 'Cerebellu',
        value: 'Cerebellu',
        row,
        values,
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).resolves.toEqual({
      status: 'valid',
      resolvedSuggestion: { value: 'brain-region-1', label: 'Cerebellum' },
    });

    await expect(
      brainRegionField?.remote?.evaluate?.({
        query: 'Cortex',
        value: 'Cortex',
        row,
        values,
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).resolves.toEqual({
      status: 'invalid',
      message: 'Multiple matches found for Brain Region. Choose one in the validator.',
      suggestions: [
        { value: 'brain-region-2', label: 'Cortex layer 2' },
        { value: 'brain-region-3', label: 'Cortex layer 5' },
      ],
    });

    await expect(
      brainRegionField?.remote?.evaluate?.({
        query: 'Atlantis',
        value: 'Atlantis',
        row,
        values,
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).resolves.toEqual({
      status: 'invalid',
      message: 'No matches found for Brain Region.',
      suggestions: [],
    });

    await brainRegionField?.remote?.query?.({
      query: 'Cerebellu',
      row,
      values,
      context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      pageParam: 0,
      pageSize: 5,
    });

    expect(queryBrainRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Cerebellu',
        queryField: 'semantic_search',
        pageParam: 0,
        pageSize: 5,
      })
    );
    expect(queryBrainRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Cerebellu',
        queryField: 'name__ilike',
      })
    );
  });

  it('keeps repair pipeline state visible and only enables it for digital reconstruction protocols', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });
    const repairField = adapter.fields.find((field) => field.path === 'repairPipelineState');

    expect(repairField?.options).toEqual(
      Object.values(RepairPipelineState).map((option) => ({
        value: option.key,
        label: option.label,
      }))
    );

    const baseSession = createImportSessionState({
      fields: adapter.fields,
      rows: [adapter.createBlankRow?.() ?? {}],
    });
    const nonDigitalSession = resolveCellSuggestion(baseSession, {
      rowId: baseSession.rows[0].id,
      fieldPath: 'protocolId',
      suggestion: {
        value: 'protocol-modified',
        label: 'Modified Protocol (modified_reconstruction)',
        metadata: {
          generationType: CellMorphologyGenerationType.ModifiedReconstruction.key,
        },
      },
    });
    const digitalSession = resolveCellSuggestion(baseSession, {
      rowId: baseSession.rows[0].id,
      fieldPath: 'protocolId',
      suggestion: {
        value: 'protocol-digital',
        label: 'Digital Protocol (digital_reconstruction)',
        metadata: {
          generationType: CellMorphologyGenerationType.DigitalReconstruction.key,
        },
      },
    });

    expect(
      repairField?.isEnabled?.({
        values: getRowSubmissionValues(nonDigitalSession.rows[0]),
        row: nonDigitalSession.rows[0],
      })
    ).toBe(false);
    expect(
      repairField?.getDisabledMessage?.({
        values: getRowSubmissionValues(nonDigitalSession.rows[0]),
        row: nonDigitalSession.rows[0],
      })
    ).toContain('digital reconstruction');
    expect(
      repairField?.isEnabled?.({
        values: getRowSubmissionValues(digitalSession.rows[0]),
        row: digitalSession.rows[0],
      })
    ).toBe(true);
  });

  it('seeds blank rows with the default brain region and license', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });

    expect(adapter.createBlankRow?.()).toMatchObject({
      brainRegionId: 'brain-region-1',
      licenseId: 'license-1',
    });
  });

  it('builds a null optional location when the cell is blank', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });

    const session = createImportSessionState({
      fields: adapter.fields,
      rows: [
        {
          sourceFile: '',
          name: 'Neuron A',
          description: 'A morphology',
          brainRegionId: 'brain-region-1',
          experimentDate: '',
          contactEmail: '',
          publishedIn: '',
          location: '',
          repairPipelineState: '',
          subjectId: 'subject-1',
          licenseId: 'license-1',
          protocolId: 'protocol-1',
          mtypeClassId: 'mtype-1',
          contributions: '',
        },
      ],
    });

    const sourceFile = new File(['swc'], 'cell.swc', { type: 'application/swc' });
    const sessionWithFile = setCellValue(session, {
      rowId: session.rows[0].id,
      fieldPath: 'sourceFile',
      rawValue: sourceFile.name,
      parsedValue: sourceFile,
    });
    const sessionWithContributions = setCellValue(sessionWithFile, {
      rowId: session.rows[0].id,
      fieldPath: 'contributions',
      rawValue: '1 contributor',
      parsedValue: [
        {
          agent_type: AgentType.Person.key,
          agent_id: 'agent-1',
          role_id: 'role-1',
        },
      ],
    });

    const row = sessionWithContributions.rows[0];
    const values = Object.fromEntries(
      Object.entries(row.cells).map(([key, cell]) => [key, cell.rawValue])
    );

    expect(
      adapter.buildPayload({
        row,
        values,
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      }).metadata.location
    ).toBeNull();
  });

  it('hydrates contribution and location csv tuples through field csv hooks', async () => {
    const services = {
      queryBrainRegion: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryLicense: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      querySubject: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryProtocol: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryMtype: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryPerson: vi.fn(async ({ query }: { query: string }) => ({
        suggestions: query === 'Jane Doe' ? [{ value: 'person-1', label: 'Jane Doe' }] : [],
        nextPageParam: null,
      })),
      queryOrganization: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryConsortium: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryRole: vi.fn(async ({ query }: { query: string }) => ({
        suggestions: query === 'Author' ? [{ value: 'role-1', label: 'Author' }] : [],
        nextPageParam: null,
      })),
      registerMorphology: vi.fn(async () => ({ id: 'morphology-1', isValid: true })),
    } as never;
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
      services,
    });
    const contributionsField = adapter.fields.find((field) => field.path === 'contributions');
    const locationField = adapter.fields.find((field) => field.path === 'location');
    const importCache = new Map<string, unknown>();

    await expect(
      contributionsField?.csv?.hydrateCell?.({
        rawValue: '[(person, Jane Doe, Author)]',
        row: adapter.createBlankRow?.() ?? {},
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
        importCache,
      })
    ).resolves.toMatchObject({
      rawValue: '',
      parsedValue: [
        expect.objectContaining({
          agent_type: AgentType.Person.key,
          agent_id: '',
          role_id: '',
          imported_agent_text: 'Jane Doe',
          imported_role_text: 'Author',
        }),
      ],
    });

    await expect(
      contributionsField?.csv?.backgroundHydrateCell?.({
        rawValue: '[(person, Jane Doe, Author)]',
        row: adapter.createBlankRow?.() ?? {},
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
        importCache,
      })
    ).resolves.toMatchObject({
      rawValue: '1 contributor',
      parsedValue: [
        expect.objectContaining({
          agent_type: AgentType.Person.key,
          agent_id: 'person-1',
          role_id: 'role-1',
          agent_label: 'Jane Doe',
          role_label: 'Author',
        }),
      ],
    });

    expect(
      locationField?.csv?.hydrateCell?.({
        rawValue: '(10, 20, 30)',
        row: adapter.createBlankRow?.() ?? {},
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).toEqual({
      rawValue: '10, 20, 30',
      parsedValue: { x: 10, y: 20, z: 30 },
    });
  });

  it('surfaces local validation issues for imported partial contributions and malformed locations', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });
    const session = createImportSessionState({
      fields: adapter.fields,
      rows: [
        {
          ...(adapter.createBlankRow?.() ?? {}),
          sourceFile: '',
          name: 'Neuron A',
          description: 'A morphology',
          brainRegionId: 'brain-region-1',
          experimentDate: '',
          contactEmail: '',
          publishedIn: '',
          location: '(1, 2)',
          repairPipelineState: '',
          subjectId: 'subject-1',
          licenseId: 'license-1',
          protocolId: 'protocol-1',
          mtypeClassId: 'mtype-1',
          contributions: '',
        },
      ],
    });
    const rowId = session.rows[0].id;
    const withContributions = setCellValue(session, {
      rowId,
      fieldPath: 'contributions',
      rawValue: '',
      parsedValue: [
        {
          id: 'csv-contribution-1',
          source_tuple: 'Jane Doe',
          agent_type: AgentType.Person.key,
          agent_id: '',
          role_id: '',
          agent_label: '',
          role_label: '',
          imported_agent_text: 'Jane Doe',
          issues: ['Role is required for contribution 1.'],
        },
      ],
    });
    const withLocation = setCellValue(withContributions, {
      rowId,
      fieldPath: 'location',
      rawValue: '(1, 2)',
      parsedValue: null,
    });

    const next = validateSessionRows({
      session: withLocation,
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

    expect(next.rows[0].cells.contributions.issues).toContain(
      'Role is required for contribution 1.'
    );
    expect(next.rows[0].cells.location.issues).toContain(
      'Location must be provided as a tuple in the form `(x, y, z)`.'
    );
  });

  it('builds the submission payload from compound row state', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });

    const session = createImportSessionState({
      fields: adapter.fields,
      rows: [
        {
          sourceFile: '',
          name: 'Neuron A',
          description: 'A morphology',
          brainRegionId: 'brain-region-1',
          experimentDate: '2026-03-24',
          contactEmail: 'test@example.org',
          publishedIn: 'Paper',
          location: '',
          repairPipelineState: '',
          subjectId: 'subject-1',
          licenseId: 'license-1',
          protocolId: 'protocol-1',
          mtypeClassId: 'mtype-1',
          contributions: '',
        },
      ],
    });

    const sourceFile = new File(['swc'], 'cell.swc', { type: 'application/swc' });
    const sessionWithCompoundValues = setCellValue(session, {
      rowId: session.rows[0].id,
      fieldPath: 'sourceFile',
      rawValue: sourceFile.name,
      parsedValue: sourceFile,
    });
    const sessionWithLocation = setCellValue(sessionWithCompoundValues, {
      rowId: session.rows[0].id,
      fieldPath: 'location',
      rawValue: '10, 20, 30',
      parsedValue: { x: 10, y: 20, z: 30 },
    });
    const sessionWithContributions = setCellValue(sessionWithLocation, {
      rowId: session.rows[0].id,
      fieldPath: 'contributions',
      rawValue: '1 contributor',
      parsedValue: [
        {
          agent_type: AgentType.Person.key,
          agent_id: 'agent-1',
          role_id: 'role-1',
        },
      ],
    });

    const row = sessionWithContributions.rows[0];
    const values = Object.fromEntries(
      Object.entries(row.cells).map(([key, cell]) => [key, cell.rawValue])
    );

    expect(
      adapter.buildPayload({
        row,
        values,
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      })
    ).toEqual({
      sourceFile,
      metadata: {
        name: 'Neuron A',
        description: 'A morphology',
        brain_region_id: 'brain-region-1',
        cell_morphology_protocol_id: 'protocol-1',
        subject_id: 'subject-1',
        license_id: 'license-1',
        experiment_date: '2026-03-24',
        contact_email: 'test@example.org',
        published_in: 'Paper',
        location: { x: 10, y: 20, z: 30 },
        repair_pipeline_state: null,
      },
      contribution: [
        {
          agent_type: AgentType.Person.key,
          agent_id: 'agent-1',
          role_id: 'role-1',
        },
      ],
      mtype_class_id: 'mtype-1',
    });
  });

  it('treats non-array contributions cell (e.g. blank row string) as empty list', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });

    const session = createImportSessionState({
      fields: adapter.fields,
      rows: [
        {
          sourceFile: '',
          name: 'Neuron A',
          description: 'A morphology',
          brainRegionId: 'brain-region-1',
          experimentDate: '',
          contactEmail: '',
          publishedIn: '',
          location: '',
          repairPipelineState: '',
          subjectId: 'subject-1',
          licenseId: 'license-1',
          protocolId: 'protocol-1',
          mtypeClassId: 'mtype-1',
          contributions: '',
        },
      ],
    });

    const sourceFile = new File(['swc'], 'cell.swc', { type: 'application/swc' });
    const sessionWithFile = setCellValue(session, {
      rowId: session.rows[0].id,
      fieldPath: 'sourceFile',
      rawValue: sourceFile.name,
      parsedValue: sourceFile,
    });

    const row = sessionWithFile.rows[0];
    const values = Object.fromEntries(
      Object.entries(row.cells).map(([key, cell]) => [key, cell.rawValue])
    );

    expect(
      adapter.buildPayload({
        row,
        values,
        context: { projectId: 'project-1', virtualLabId: 'lab-1' },
      }).contribution
    ).toEqual([]);
  });

  it('submits morphology registration, contributions, and m-type classification in sequence', async () => {
    const services = {
      registerMorphology: vi.fn(async () => ({ id: 'morphology-1', isValid: true })),
      queryBrainRegion: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryLicense: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      querySubject: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryProtocol: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryMtype: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryPerson: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryOrganization: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryConsortium: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
      queryRole: vi.fn(async () => ({ suggestions: [], nextPageParam: null })),
    };
    const postSubmitActions: IEntityImportPostSubmitActions = {
      createContribution: vi.fn(async () => ({ id: 'contribution-1' })),
      createMtypeClassification: vi.fn(async () => ({ id: 'classification-1' })),
    };
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
      services,
      postSubmitActions,
    });

    const sourceFile = new File(['swc'], 'cell.swc', { type: 'application/swc' });
    const payload: CellMorphologySubmissionPayload = {
      sourceFile,
      metadata: {
        name: 'Neuron A',
        description: 'A morphology',
        brain_region_id: 'brain-region-1',
        cell_morphology_protocol_id: 'protocol-1',
        subject_id: 'subject-1',
        license_id: 'license-1',
        experiment_date: '2026-03-24',
        contact_email: 'test@example.org',
        published_in: 'Paper',
        location: null,
        repair_pipeline_state: null,
      },
      contribution: [
        {
          agent_type: AgentType.Person.key,
          agent_id: 'agent-1',
          role_id: 'role-1',
        },
      ],
      mtype_class_id: 'mtype-1',
    };
    const row = createImportSessionState({
      fields: adapter.fields,
      rows: [adapter.createBlankRow?.() ?? {}],
    }).rows[0];

    await adapter.submitRow({
      payload,
      row,
      values: {},
      context: { projectId: 'project-1', virtualLabId: 'lab-1' },
    });

    expect(services.registerMorphology).toHaveBeenCalledWith({
      file: sourceFile,
      metadata: payload.metadata,
      context: { projectId: 'project-1', virtualLabId: 'lab-1' },
    });
    expect(postSubmitActions.createContribution).toHaveBeenCalledWith({
      entityId: 'morphology-1',
      contribution: payload.contribution[0],
      context: { projectId: 'project-1', virtualLabId: 'lab-1' },
    });
    expect(postSubmitActions.createMtypeClassification).toHaveBeenCalledWith({
      entityId: 'morphology-1',
      mtypeClassId: 'mtype-1',
      context: { projectId: 'project-1', virtualLabId: 'lab-1' },
    });
  });

  it('exposes a zod schema that requires the source file and contribution payload', () => {
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
    });

    expect(
      adapter.schema.safeParse({
        sourceFile: null,
        metadata: {},
        contribution: [],
        mtype_class_id: '',
      }).success
    ).toBe(false);

    expect(adapter.schema).toBeInstanceOf(z.ZodType);
  });
});
