import { describe, expect, it, vi } from 'vitest';

import {
  makeBrainRegionImportField,
  makeSubjectImportField,
} from '@/features/entity-import/core/shared/field-builders';

describe('field builders', () => {
  it('gives brain region a dedicated table renderer instead of the generic remote-select cell UI', () => {
    const field = makeBrainRegionImportField({
      path: 'brainRegionId',
      submissionPath: 'brainRegion',
      validationPath: 'brainRegion',
      services: {
        queryBrainRegion: vi.fn(),
        querySpecies: vi.fn(),
      },
    });

    expect(field.tableRenderer).toBeDefined();
    expect(field.panelRendererOwnsSuggestions).toBe(true);
    expect(field.remoteSelectionBadge).toBeUndefined();
  });

  it('keeps subject on the shared remote-select table renderer', () => {
    const field = makeSubjectImportField({
      path: 'subjectId',
      submissionPath: 'subject',
      validationPath: 'subject',
      services: {
        querySubject: vi.fn(),
        querySpecies: vi.fn(),
      },
    });

    expect(field.tableRenderer).toBeUndefined();
  });
});
