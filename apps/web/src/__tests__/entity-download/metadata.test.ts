import { describe, expect, it } from 'vitest';

import { Metadata } from '@/features/entity-download/metadata';

import { collectFileEntries, readEntryText } from './fixtures';

describe('Metadata', () => {
  it('tracks how many entries have been added', () => {
    const metadata = new Metadata<{ id: string }>();

    expect(metadata.entriesCount).toBe(0);
    metadata.add({
      csv: {
        idx: 0,
        name: 'a',
        description: '',
        subject_name: '',
        species_name: '',
        brain_region: '',
        contributors: '',
      },
      json: { id: 'a' },
    });
    expect(metadata.entriesCount).toBe(1);
  });

  it('yields metadata.json and metadata.csv for collected entries', async () => {
    const metadata = new Metadata<{ id: string; name: string }>();

    metadata.add({
      csv: {
        idx: 0,
        name: 'Morph A',
        description: 'desc',
        subject_name: 'subj',
        species_name: 'mouse',
        brain_region: 'SS',
        contributors: 'Alice;Bob',
        data_path: 'data/0',
      },
      json: { id: 'e1', name: 'Morph A' },
    });

    const entries = await collectFileEntries(metadata.getFileEntries());

    expect(entries.map((e) => e.path)).toEqual(['metadata.json', 'metadata.csv']);

    const jsonText = await readEntryText(entries[0]);
    expect(JSON.parse(jsonText)).toEqual([{ id: 'e1', name: 'Morph A' }]);

    const csvText = await readEntryText(entries[1]);
    expect(csvText).toContain('name');
    expect(csvText).toContain('Morph A');
    expect(csvText).toContain('data/0');
  });
});
