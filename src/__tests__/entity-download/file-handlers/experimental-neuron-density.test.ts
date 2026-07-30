import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getExperimentalNeuronDensity } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { getExperimentalNeuronDensityFiles } from '@/features/entity-download/file-handlers/experimental-neuron-density';

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
  return { ...actual, getExperimentalNeuronDensity: vi.fn() };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getExperimentalNeuronDensityFiles', () => {
  beforeEach(() => {
    vi.mocked(getExperimentalNeuronDensity).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages README and metadata without asset files', async () => {
    vi.mocked(getExperimentalNeuronDensity).mockResolvedValue(
      makeEntityBase({
        id: 'nd1',
        type: EntityTypeDict.ExperimentalNeuronDensity,
        name: 'Neuron density A',
      }) as never
    );

    const entries = await collectFileEntries(getExperimentalNeuronDensityFiles(['nd1']));

    expect(pathsOf(entries)).toEqual(['README.md', 'metadata.json', 'metadata.csv']);

    const metadataJson = JSON.parse(await readEntryText(entries[1]));
    expect(metadataJson[0]).toMatchObject({ id: 'nd1', idx: 0, name: 'Neuron density A' });
    expect(metadataJson[0].data_path).toBeUndefined();
  });
});
