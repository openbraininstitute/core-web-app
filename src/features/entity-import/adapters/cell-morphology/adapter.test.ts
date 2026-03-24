import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { AgentType } from '@/ui/segments/contribute/shared/types';

import { createImportSessionState, setCellValue } from '../../core/session';
import { type CellMorphologySubmissionPayload, createCellMorphologyImportAdapter } from './adapter';

describe('createCellMorphologyImportAdapter', () => {
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
        project_id: 'project-1',
        virtual_lab_id: 'lab-1',
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
      createContribution: vi.fn(async () => ({ id: 'contribution-1' })),
      createMtypeClassification: vi.fn(async () => ({ id: 'classification-1' })),
      searchBrainRegions: vi.fn(async () => []),
      searchLicenses: vi.fn(async () => []),
      searchSubjects: vi.fn(async () => []),
      searchProtocols: vi.fn(async () => []),
      searchMtypes: vi.fn(async () => []),
      searchPersons: vi.fn(async () => []),
      searchOrganizations: vi.fn(async () => []),
      searchConsortia: vi.fn(async () => []),
      searchRoles: vi.fn(async () => []),
    };
    const adapter = createCellMorphologyImportAdapter({
      defaultBrainRegionId: 'brain-region-1',
      defaultLicenseId: 'license-1',
      services,
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
        project_id: 'project-1',
        virtual_lab_id: 'lab-1',
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
    expect(services.createContribution).toHaveBeenCalledWith({
      entityId: 'morphology-1',
      contribution: payload.contribution[0],
      context: { projectId: 'project-1', virtualLabId: 'lab-1' },
    });
    expect(services.createMtypeClassification).toHaveBeenCalledWith({
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
