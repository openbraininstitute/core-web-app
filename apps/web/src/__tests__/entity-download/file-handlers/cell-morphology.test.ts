import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCellMorphology } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getCellMorphologyFiles } from '@/features/entity-download/file-handlers/cell-morphology';

import {
  collectFileEntries,
  makeAsset,
  makeEntityBase,
  mockSuccessfulDownload,
  pathsOf,
  readEntryText,
  TEST_USERNAME,
} from '../fixtures';

const { getSessionMock, downloadAssetMock } = vi.hoisted(() => {
  const downloadAssetMock = vi.fn(async () => {
    const buffer = Buffer.from('morph-bytes');
    return new Response(buffer, {
      headers: { 'content-length': String(buffer.length) },
    });
  });

  return {
    getSessionMock: vi.fn(async () => ({
      user: { username: 'test-user' },
      accessToken: 'token',
    })),
    downloadAssetMock,
  };
});

vi.mock('@/auth-fetch', () => ({
  getSession: getSessionMock,
}));

vi.mock('@/api/entitycore/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries')>();
  return {
    ...actual,
    getCellMorphology: vi.fn(),
  };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return {
    ...actual,
    downloadAsset: downloadAssetMock,
  };
});

describe('getCellMorphologyFiles', () => {
  beforeEach(() => {
    vi.mocked(getCellMorphology).mockReset();
    downloadAssetMock.mockReset();
    downloadAssetMock.mockImplementation(mockSuccessfulDownload('morph-bytes'));
    getSessionMock.mockResolvedValue({
      user: { username: TEST_USERNAME },
      accessToken: 'token',
    });
  });

  it('packages README, all morphology assets under data/{idx}, and metadata files', async () => {
    const asset = makeAsset({
      id: 'a1',
      path: 'morphology.swc',
      label: AssetLabel.morphology,
    });

    vi.mocked(getCellMorphology).mockResolvedValue(
      makeEntityBase({
        id: 'm1',
        type: EntityTypeDict.CellMorphology,
        name: 'Morph A',
        assets: [asset],
      }) as never
    );

    const entries = await collectFileEntries(getCellMorphologyFiles(['m1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/morphology.swc',
      'metadata.json',
      'metadata.csv',
    ]);

    const readme = await readEntryText(entries[0]);
    expect(readme).toContain(TEST_USERNAME);

    const metadataJson = JSON.parse(await readEntryText(entries[2]));
    expect(metadataJson).toEqual([
      expect.objectContaining({
        id: 'm1',
        idx: 0,
        data_path: 'data/0',
        name: 'Morph A',
      }),
    ]);

    const metadataCsv = await readEntryText(entries[3]);
    expect(metadataCsv).toContain('Morph A');
    expect(metadataCsv).toContain('data/0');
  });

  it('skips assets that fail to download and still emits metadata', async () => {
    downloadAssetMock.mockRejectedValue(new Error('download failed'));
    vi.mocked(getCellMorphology).mockResolvedValue(
      makeEntityBase({
        id: 'm1',
        type: EntityTypeDict.CellMorphology,
        assets: [
          makeAsset({
            id: 'a1',
            path: 'morphology.swc',
            label: AssetLabel.morphology,
          }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getCellMorphologyFiles(['m1']));

    expect(pathsOf(entries)).toEqual(['README.md', 'metadata.json', 'metadata.csv']);
  });
});
