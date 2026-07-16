import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getExperimentalSynapsesPerConnection } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { getExperimentalSynapsesPerConnectionFiles } from '@/features/entity-download/file-handlers/experimental-synapses-per-connection';

import { collectFileEntries, makeEntityBase, pathsOf, readEntryText } from '../fixtures';
import { resetDownloadBoundaryMocks } from '../mock-boundaries';

const { downloadAssetMock, getSessionMock } = vi.hoisted(() => ({
  downloadAssetMock: vi.fn(),
  getSessionMock: vi.fn(async () => ({
    user: { username: 'test-user' },
    accessToken: 'token',
  })),
}));

vi.mock('@/auth-fetch', () => ({ getSession: getSessionMock }));

vi.mock('@/api/entitycore/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries')>();
  return { ...actual, getExperimentalSynapsesPerConnection: vi.fn() };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getExperimentalSynapsesPerConnectionFiles', () => {
  beforeEach(() => {
    vi.mocked(getExperimentalSynapsesPerConnection).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages README and metadata without asset files', async () => {
    vi.mocked(getExperimentalSynapsesPerConnection).mockResolvedValue(
      makeEntityBase({
        id: 'spc1',
        type: EntityTypeDict.ExperimentalSynapsesPerConnection,
        name: 'Synapses A',
      }) as never
    );

    const entries = await collectFileEntries(getExperimentalSynapsesPerConnectionFiles(['spc1']));

    expect(pathsOf(entries)).toEqual(['README.md', 'metadata.json', 'metadata.csv']);

    const metadataJson = JSON.parse(await readEntryText(entries[1]));
    expect(metadataJson[0]).toMatchObject({ id: 'spc1', idx: 0, name: 'Synapses A' });
    expect(metadataJson[0].data_path).toBeUndefined();
  });
});
