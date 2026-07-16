import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import {
  getDownloadStreamHeaders,
  getMetadataCsvEntryBase,
  getMetadataSimulationCsvEntryBase,
} from '@/features/entity-download/utils';

import { makeEntityBase } from './fixtures';

describe('getDownloadStreamHeaders', () => {
  it('returns gzip content type and attachment disposition for the filename', () => {
    expect(getDownloadStreamHeaders({ filename: 'bundle.tar.gz' })).toEqual({
      'Content-Type': 'application/gzip',
      'Content-Disposition': 'attachment; filename="bundle.tar.gz"',
    });
  });
});

describe('getMetadataCsvEntryBase', () => {
  it('flattens entity identity fields used in download metadata CSV rows', () => {
    const entity = makeEntityBase({
      id: 'e1',
      type: EntityTypeDict.CellMorphology,
      name: 'Morph A',
      description: 'A morphology',
    });

    expect(getMetadataCsvEntryBase(entity as never)).toEqual({
      name: 'Morph A',
      description: 'A morphology',
      subject_name: 'subject-1',
      species_name: 'Mus musculus',
      brain_region: 'Somatosensory',
      contributors: 'Alice;Bob',
    });
  });

  it('falls back to entity.species when subject.species is missing', () => {
    const entity = {
      ...makeEntityBase({
        id: 'e1',
        type: EntityTypeDict.CellMorphology,
      }),
      subject: { name: 'subject-1' },
      species: { name: 'Rattus norvegicus' },
    };

    expect(getMetadataCsvEntryBase(entity as never).species_name).toBe('Rattus norvegicus');
  });
});

describe('getMetadataSimulationCsvEntryBase', () => {
  it('keeps only name and description for simulation campaign CSV rows', () => {
    const entity = makeEntityBase({
      id: 'camp-1',
      type: EntityTypeDict.SimulationCampaign,
      name: 'Campaign',
      description: 'Sim campaign',
    });

    expect(getMetadataSimulationCsvEntryBase(entity as never)).toEqual({
      name: 'Campaign',
      description: 'Sim campaign',
    });
  });
});
