import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAnalysisNotebookTemplate } from '@/api/entitycore/queries/analysis-notebook-template';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getNotebookFiles } from '@/features/entity-download/file-handlers/notebook';

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

vi.mock('@/api/entitycore/queries/analysis-notebook-template', () => ({
  getAnalysisNotebookTemplate: vi.fn(),
}));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return { ...actual, downloadAsset: downloadAssetMock };
});

describe('getNotebookFiles', () => {
  beforeEach(() => {
    vi.mocked(getAnalysisNotebookTemplate).mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages notebook assets under data/{idx} and metadata files', async () => {
    vi.mocked(getAnalysisNotebookTemplate).mockResolvedValue(
      makeEntityBase({
        id: 'nb1',
        type: EntityTypeDict.AnalysisNotebookTemplate,
        name: 'Notebook A',
        assets: [
          makeAsset({ id: 'a1', path: 'analysis.ipynb', label: AssetLabel.jupyter_notebook }),
        ],
      }) as never
    );

    const entries = await collectFileEntries(getNotebookFiles(['nb1']));

    expect(pathsOf(entries)).toEqual(['data/0/analysis.ipynb', 'metadata.json', 'metadata.csv']);

    const metadataJson = JSON.parse(await readEntryText(entries[1]));
    expect(metadataJson[0]).toMatchObject({ id: 'nb1', idx: 0, data_path: 'data/0' });
  });
});
