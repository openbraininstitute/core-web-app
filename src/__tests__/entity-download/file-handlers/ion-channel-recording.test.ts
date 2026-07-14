import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIonChannelRecording } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getIonChannelRecordingFiles } from '@/features/entity-download/file-handlers/ion-channel-recording';

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
  return { ...actual, getIonChannelRecording: vi.fn() };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getIonChannelRecordingFiles', () => {
  beforeEach(() => {
    vi.mocked(getIonChannelRecording).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages README, all recording assets under data/{idx}, and metadata files', async () => {
    vi.mocked(getIonChannelRecording).mockResolvedValue(
      makeEntityBase({
        id: 'icr1',
        type: EntityTypeDict.IonChannelRecording,
        name: 'IC Trace',
        assets: [makeAsset({ id: 'a1', path: 'ic.nwb', label: AssetLabel.nwb })],
      }) as never
    );

    const entries = await collectFileEntries(getIonChannelRecordingFiles(['icr1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/ic.nwb',
      'metadata.json',
      'metadata.csv',
    ]);

    const metadataJson = JSON.parse(await readEntryText(entries[2]));
    expect(metadataJson[0]).toMatchObject({ id: 'icr1', idx: 0, data_path: 'data/0' });
  });
});
