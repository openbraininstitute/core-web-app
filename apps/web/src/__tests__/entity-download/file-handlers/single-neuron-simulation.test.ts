import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSingleNeuronSimulation } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getSingleNeuronSimulationFiles } from '@/features/entity-download/file-handlers/single-neuron-simulation';

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
  return { ...actual, getSingleNeuronSimulation: vi.fn() };
});

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getSingleNeuronSimulationFiles', () => {
  beforeEach(() => {
    vi.mocked(getSingleNeuronSimulation).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages only the single_neuron_simulation_data asset', async () => {
    vi.mocked(getSingleNeuronSimulation).mockResolvedValue(
      makeEntityBase({
        id: 'sns1',
        type: EntityTypeDict.SingleNeuronSimulation,
        name: 'Sim A',
        assets: [
          makeAsset({
            id: 'a1',
            path: 'sim.json',
            label: AssetLabel.single_neuron_simulation_data,
          }),
          makeAsset({
            id: 'a2',
            path: 'thumb.png',
            label: AssetLabel.simulation_designer_image,
          }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getSingleNeuronSimulationFiles(['sns1']));

    expect(pathsOf(entries)).toEqual(['data/0/sim.json', 'metadata.json', 'metadata.csv']);

    const metadataJson = JSON.parse(await readEntryText(entries[1]));
    expect(metadataJson[0]).toMatchObject({ id: 'sns1', idx: 0, data_path: 'data/0' });
  });
});
