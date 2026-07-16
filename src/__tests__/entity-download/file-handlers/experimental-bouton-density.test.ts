import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getExperimentalBoutonDensity } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { getExperimentalBoutonDensityFiles } from '@/features/entity-download/file-handlers/experimental-bouton-density';

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
  return { ...actual, getExperimentalBoutonDensity: vi.fn() };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getExperimentalBoutonDensityFiles', () => {
  beforeEach(() => {
    vi.mocked(getExperimentalBoutonDensity).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages README and metadata without asset files', async () => {
    vi.mocked(getExperimentalBoutonDensity).mockResolvedValue(
      makeEntityBase({
        id: 'bd1',
        type: EntityTypeDict.ExperimentalBoutonDensity,
        name: 'Bouton A',
      }) as never
    );

    const entries = await collectFileEntries(getExperimentalBoutonDensityFiles(['bd1']));

    expect(pathsOf(entries)).toEqual(['README.md', 'metadata.json', 'metadata.csv']);

    const metadataJson = JSON.parse(await readEntryText(entries[1]));
    expect(metadataJson[0]).toMatchObject({ id: 'bd1', idx: 0, name: 'Bouton A' });
    expect(metadataJson[0].data_path).toBeUndefined();
  });
});
