import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getSimulationCampaign } from '@/api/entitycore/queries/simulation/campaign';
import { getSimulations } from '@/api/entitycore/queries/simulation/campaign/simulation';
import { getSimulationExecutions } from '@/api/entitycore/queries/simulation/campaign/simulation-execution';
import { getSimulationResult } from '@/api/entitycore/queries/simulation/campaign/simulation-result';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getCircuitSimulationFiles } from '@/features/entity-download/file-handlers/circuit-simulation';

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

vi.mock('@/api/entitycore/queries/simulation/campaign', () => ({
  getSimulationCampaign: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/simulation/campaign/simulation', () => ({
  getSimulations: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/simulation/campaign/simulation-execution', () => ({
  getSimulationExecutions: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/simulation/campaign/simulation-result', () => ({
  getSimulationResult: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getCircuitSimulationFiles', () => {
  beforeEach(() => {
    vi.mocked(getSimulationCampaign).mockReset();
    vi.mocked(getSimulations).mockReset();
    vi.mocked(getSimulationExecutions).mockReset();
    vi.mocked(getSimulationResult).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages campaign config, simulation assets, and result assets under output/', async () => {
    const campaignConfig = makeAsset({
      id: 'cfg1',
      path: 'campaign.json',
      label: AssetLabel.campaign_generation_config,
    });

    vi.mocked(getSimulationCampaign).mockResolvedValue(
      makeEntityBase({
        id: 'camp1',
        type: EntityTypeDict.SimulationCampaign,
        name: 'Campaign A',
        description: 'A campaign',
        assets: [campaignConfig],
      }) as never
    );

    const simulation = makeEntityBase({
      id: 'sim1',
      type: EntityTypeDict.Simulation,
      name: 'run-1',
      assets: [
        makeAsset({
          id: 'sa1',
          path: 'sim_config.json',
          label: AssetLabel.sonata_simulation_config,
        }),
      ],
    });

    vi.mocked(getSimulations).mockResolvedValue({ data: [simulation] } as never);

    vi.mocked(getSimulationExecutions).mockResolvedValue({
      data: [{ id: 'exec1', generated: [{ id: 'res1' }] }],
    } as never);

    vi.mocked(getSimulationResult).mockResolvedValue(
      makeEntityBase({
        id: 'res1',
        type: 'simulation_result',
        name: 'Result',
        assets: [makeAsset({ id: 'ra1', path: 'spikes.h5', label: AssetLabel.spike_report })],
      }) as never
    );

    const entries = await collectFileEntries(getCircuitSimulationFiles(['camp1']));

    expect(pathsOf(entries)).toEqual([
      'data/0/campaign.json',
      'data/0/run-1/sim_config.json',
      'data/0/run-1/output/spikes.h5',
      'metadata.json',
      'metadata.csv',
    ]);

    const metadataJson = JSON.parse(await readEntryText(entries[3]));
    expect(metadataJson[0]).toMatchObject({
      id: 'camp1',
      idx: 0,
      data_path: 'data/0',
      name: 'Campaign A',
    });
    expect(metadataJson[0].simulations['run-1']).toBeDefined();
  });

  it('skips campaigns that lack a campaign_generation_config asset', async () => {
    vi.mocked(getSimulationCampaign).mockResolvedValue(
      makeEntityBase({
        id: 'camp1',
        type: EntityTypeDict.SimulationCampaign,
        assets: [
          makeAsset({
            id: 'summary',
            path: 'summary.json',
            label: AssetLabel.campaign_summary,
          }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getCircuitSimulationFiles(['camp1']));

    expect(pathsOf(entries)).toEqual(['metadata.json', 'metadata.csv']);
    expect(JSON.parse(await readEntryText(entries[0]))).toEqual([]);
  });
});
