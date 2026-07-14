import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAnalysisNotebookResult } from '@/api/entitycore/queries/analysis-notebook-result';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getNotebookResultFiles } from '@/features/entity-download/file-handlers/analysis-notebook-result';

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

vi.mock('@/api/entitycore/queries/analysis-notebook-result', () => ({
  getAnalysisNotebookResult: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getNotebookResultFiles', () => {
  beforeEach(() => {
    vi.mocked(getAnalysisNotebookResult).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages notebook result assets under data/{idx} and metadata files', async () => {
    vi.mocked(getAnalysisNotebookResult).mockResolvedValue(
      makeEntityBase({
        id: 'nbr1',
        type: EntityTypeDict.AnalysisNotebookResult,
        name: 'Result A',
        assets: [
          makeAsset({
            id: 'a1',
            path: 'output.json',
            label: AssetLabel.notebook_required_files,
          }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getNotebookResultFiles(['nbr1']));

    expect(pathsOf(entries)).toEqual(['data/0/output.json', 'metadata.json', 'metadata.csv']);

    const metadataJson = JSON.parse(await readEntryText(entries[1]));
    expect(metadataJson[0]).toMatchObject({ id: 'nbr1', idx: 0, data_path: 'data/0' });
  });
});
