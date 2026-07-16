import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIonChannelModel } from '@/api/entitycore/queries/model/ion-channel-model';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getIonChannelModelFiles } from '@/features/entity-download/file-handlers/ion-channel-model';

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

vi.mock('@/api/entitycore/queries/model/ion-channel-model', () => ({
  getIonChannelModel: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getIonChannelModelFiles', () => {
  beforeEach(() => {
    vi.mocked(getIonChannelModel).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages README, neuron_mechanisms asset, and metadata files', async () => {
    vi.mocked(getIonChannelModel).mockResolvedValue(
      makeEntityBase({
        id: 'icm1',
        type: EntityTypeDict.IonChannelModel,
        name: 'IC Model',
        assets: [
          makeAsset({ id: 'a1', path: 'mech.mod', label: AssetLabel.neuron_mechanisms }),
          makeAsset({
            id: 'a2',
            path: 'thumb.png',
            label: AssetLabel.ion_channel_model_thumbnail,
          }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getIonChannelModelFiles(['icm1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/mech.mod',
      'metadata.json',
      'metadata.csv',
    ]);

    const metadataJson = JSON.parse(await readEntryText(entries[2]));
    expect(metadataJson[0]).toMatchObject({ id: 'icm1', idx: 0, data_path: 'data/0' });
  });
});
