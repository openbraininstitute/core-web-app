import { describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import {
  getDownloadStreamHeaders,
  getEntityArchiveFilename,
  getMetadataCsvEntryBase,
  getMetadataSimulationCsvEntryBase,
  readWithRangeResume,
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

describe('getEntityArchiveFilename', () => {
  it('names the archive after the single selected entity', () => {
    expect(
      getEntityArchiveFilename({
        entityType: EntityTypeDict.TaskResult,
        name: 'EFeature Extraction Result — efeaure-op3',
      })
    ).toBe('task-result__EFeature-Extraction-Result-efeaure-op3.tar.gz');
  });

  it('falls back to the type alone for a multi-selection', () => {
    expect(getEntityArchiveFilename({ entityType: EntityTypeDict.CellMorphology })).toBe(
      'cell-morphology.tar.gz'
    );
  });

  it('keeps the header intact for a name carrying quotes, slashes or newlines', () => {
    const filename = getEntityArchiveFilename({
      entityType: EntityTypeDict.TaskResult,
      // a raw name here would break Content-Disposition or read as a path
      name: 'run "1"/2\n',
    });

    expect(filename).toBe('task-result__run-1-2.tar.gz');
    expect(filename).not.toMatch(/["\\/\n]/);
    expect(getDownloadStreamHeaders({ filename })['Content-Disposition']).toBe(
      'attachment; filename="task-result__run-1-2.tar.gz"'
    );
  });

  it('caps a very long name', () => {
    const filename = getEntityArchiveFilename({
      entityType: EntityTypeDict.TaskResult,
      name: 'x'.repeat(400),
    });

    expect(filename).toBe(`task-result__${'x'.repeat(100)}.tar.gz`);
  });

  it('falls back to the type when the name sanitizes to nothing', () => {
    expect(getEntityArchiveFilename({ entityType: EntityTypeDict.TaskResult, name: '—' })).toBe(
      'task-result.tar.gz'
    );
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

describe('readWithRangeResume', () => {
  it('re-fetches from the last written byte when the body dies mid-transfer', async () => {
    const full = Buffer.from('0123456789');
    let pulls = 0;
    const dying = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls === 1) {
          controller.enqueue(full.subarray(0, 4));
          return undefined;
        }
        // let the first chunk reach the consumer before the socket "dies"
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            controller.error(new TypeError('terminated'));
            resolve();
          }, 10);
        });
      },
    });
    const response = new Response(dying, { headers: { 'content-length': '10' } });
    Object.defineProperty(response, 'url', { value: 'https://s3.example/asset' });
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const range = String((init?.headers as Record<string, string>).Range);
      const from = Number(/bytes=(\d+)-/.exec(range)?.[1]);
      return new Response(full.subarray(from), { status: 206 });
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of readWithRangeResume(response, 10)) chunks.push(chunk);

      expect(Buffer.concat(chunks).toString()).toBe('0123456789');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://s3.example/asset',
        expect.objectContaining({ headers: { Range: 'bytes=4-' } })
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('gives up when the resume is not a partial response', async () => {
    const dying = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new TypeError('terminated'));
      },
    });
    const response = new Response(dying);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 200 }))
    );

    try {
      const chunks: Buffer[] = [];
      await expect(
        (async () => {
          for await (const chunk of readWithRangeResume(response, 10)) chunks.push(chunk);
        })()
      ).rejects.toThrow('terminated');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
