import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSimulatableExtracellularRecordingArray } from '@/api/entitycore/queries/model/simulatable-extracellular-recording-array';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getSimulatableExtracellularRecordingArrayFiles } from '@/features/entity-download/file-handlers/simulatable-extracellular-recording-array';

import { collectFileEntries, makeAsset, makeEntityBase, pathsOf, readEntryText } from '../fixtures';
import { resetDownloadBoundaryMocks } from '../mock-boundaries';

const { downloadAssetMock, getSessionMock } = vi.hoisted(() => {
  const downloadAssetMock = vi.fn(async () => {
    const buffer = Buffer.from('asset-bytes');
    return new Response(buffer, {
      headers: { 'content-length': String(buffer.length) },
    });
  });
  const getSessionMock = vi.fn(async () => ({
    user: { username: 'test-user' },
    accessToken: 'token',
  }));
  return { downloadAssetMock, getSessionMock };
});

vi.mock('@/auth-fetch', () => ({ getSession: getSessionMock }));

vi.mock('@/api/entitycore/queries/model/simulatable-extracellular-recording-array', () => ({
  getSimulatableExtracellularRecordingArray: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getSimulatableExtracellularRecordingArrayFiles', () => {
  beforeEach(() => {
    vi.mocked(getSimulatableExtracellularRecordingArray).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages README, all assets under data/{idx}, and metadata files', async () => {
    vi.mocked(getSimulatableExtracellularRecordingArray).mockResolvedValue(
      makeEntityBase({
        id: 'sera1',
        type: EntityTypeDict.SimulatableExtracellularRecordingArray,
        name: 'Array A',
        assets: [
          makeAsset({
            id: 'a1',
            path: 'weights.h5',
            label: AssetLabel.electrode_array_weight_matrix,
          }),
          makeAsset({
            id: 'a2',
            path: 'locations.json',
            label: AssetLabel.electrode_locations,
          }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(
      getSimulatableExtracellularRecordingArrayFiles(['sera1'])
    );

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/weights.h5',
      'data/0/locations.json',
      'metadata.json',
      'metadata.csv',
    ]);

    const metadataJson = JSON.parse(await readEntryText(entries[3]));
    expect(metadataJson[0]).toMatchObject({ id: 'sera1', idx: 0, data_path: 'data/0' });
  });
});
