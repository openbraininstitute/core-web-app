import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getCircuitFiles } from '@/features/entity-download/file-handlers/circuit';

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

vi.mock('@/api/entitycore/queries/model/circuit', () => ({
  getCircuit: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getCircuitFiles', () => {
  beforeEach(() => {
    vi.mocked(getCircuit).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages only compressed_sonata_circuit and circuit_visualization assets', async () => {
    vi.mocked(getCircuit).mockResolvedValue(
      makeEntityBase({
        id: 'c1',
        type: EntityTypeDict.Circuit,
        name: 'Circuit A',
        assets: [
          makeAsset({
            id: 'a1',
            path: 'circuit.tar.gz',
            label: AssetLabel.compressed_sonata_circuit,
          }),
          makeAsset({
            id: 'a2',
            path: 'viz.json',
            label: AssetLabel.circuit_visualization,
          }),
          makeAsset({
            id: 'a3',
            path: 'extra.json',
            label: AssetLabel.sonata_circuit,
          }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getCircuitFiles(['c1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/circuit.tar.gz',
      'data/0/viz.json',
      'metadata.json',
      'metadata.csv',
    ]);

    const metadataJson = JSON.parse(await readEntryText(entries[3]));
    expect(metadataJson[0]).toMatchObject({ id: 'c1', idx: 0, data_path: 'data/0' });
  });
});
