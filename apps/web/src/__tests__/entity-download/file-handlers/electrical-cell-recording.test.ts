import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getElectricalCellRecording } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getElectricalCellRecordingFiles } from '@/features/entity-download/file-handlers/electrical-cell-recording';

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

vi.mock('@/api/entitycore/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries')>();
  return { ...actual, getElectricalCellRecording: vi.fn() };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getElectricalCellRecordingFiles', () => {
  beforeEach(() => {
    vi.mocked(getElectricalCellRecording).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages README, all recording assets under data/{idx}, and metadata files', async () => {
    vi.mocked(getElectricalCellRecording).mockResolvedValue(
      makeEntityBase({
        id: 'r1',
        type: EntityTypeDict.ElectricalCellRecording,
        name: 'Trace A',
        assets: [makeAsset({ id: 'a1', path: 'trace.nwb', label: AssetLabel.nwb })],
      }) as never
    );

    const entries = await collectFileEntries(getElectricalCellRecordingFiles(['r1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/trace.nwb',
      'metadata.json',
      'metadata.csv',
    ]);

    const metadataJson = JSON.parse(await readEntryText(entries[2]));
    expect(metadataJson[0]).toMatchObject({ id: 'r1', idx: 0, data_path: 'data/0' });
  });
});
