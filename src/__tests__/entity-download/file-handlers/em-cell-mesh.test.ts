import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getEmCellMesh } from '@/api/entitycore/queries/experimental/em-cell-mesh';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getEMCellMeshFiles } from '@/features/entity-download/file-handlers/em-cell-mesh';

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

vi.mock('@/api/entitycore/queries/experimental/em-cell-mesh', () => ({
  getEmCellMesh: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getEMCellMeshFiles', () => {
  beforeEach(() => {
    vi.mocked(getEmCellMesh).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages all mesh assets under data/{idx} and metadata files', async () => {
    vi.mocked(getEmCellMesh).mockResolvedValue(
      makeEntityBase({
        id: 'em1',
        type: EntityTypeDict.EMCellMesh,
        name: 'Mesh A',
        assets: [makeAsset({ id: 'a1', path: 'mesh.obj', label: AssetLabel.cell_surface_mesh })],
      }) as never
    );

    const entries = await collectFileEntries(getEMCellMeshFiles(['em1']));

    // No README template ships for EM cell mesh today.
    expect(pathsOf(entries)).toEqual(['data/0/mesh.obj', 'metadata.json', 'metadata.csv']);

    const metadataJson = JSON.parse(await readEntryText(entries[1]));
    expect(metadataJson[0]).toMatchObject({ id: 'em1', idx: 0, data_path: 'data/0' });
  });
});
