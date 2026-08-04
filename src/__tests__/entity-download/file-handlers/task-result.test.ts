import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getTaskResult } from '@/api/entitycore/queries/task';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { getTaskResultFiles } from '@/features/entity-download/file-handlers/task-result';

import { collectFileEntries, makeAsset, makeEntityBase, pathsOf, readEntryText } from '../fixtures';
import { resetDownloadBoundaryMocks } from '../mock-boundaries';

const { downloadAssetMock, listDirectoryOfAssetsMock, getSessionMock } = vi.hoisted(() => {
  const downloadAssetMock = vi.fn(async () => {
    const buffer = Buffer.from('asset-bytes');
    return new Response(buffer, { headers: { 'content-length': String(buffer.length) } });
  });
  const listDirectoryOfAssetsMock = vi.fn(async () => ({ files: {} }));
  const getSessionMock = vi.fn(async () => ({
    user: { username: 'test-user' },
    accessToken: 'token',
  }));
  return { downloadAssetMock, listDirectoryOfAssetsMock, getSessionMock };
});

vi.mock('@/auth-fetch', () => ({ getSession: getSessionMock }));

vi.mock('@/api/entitycore/queries/task', () => ({ getTaskResult: vi.fn() }));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return {
    ...actual,
    downloadAsset: downloadAssetMock,
    listDirectoryOfAssets: listDirectoryOfAssetsMock,
  };
});

/** an e-feature extraction result: one JSON file plus the figures folder */
function makeEFeatureResult(id: string) {
  return makeEntityBase({
    id,
    type: EntityTypeDict.TaskResult,
    name: 'EFeature Extraction Result',
    task_result_type: 'efeature_extraction__result',
    assets: [
      makeAsset({
        id: 'asset-features',
        path: 'extracted_features.json',
        content_type: AssetContentType.json,
        label: AssetLabel.efeature_extraction_features,
      }),
      makeAsset({
        id: 'asset-figures',
        path: 'figures',
        is_directory: true,
        content_type: AssetContentType.directory,
        label: AssetLabel.efeature_extraction_figures,
      }),
    ],
  }) as never;
}

describe('getTaskResultFiles', () => {
  beforeEach(() => {
    vi.mocked(getTaskResult).mockReset();
    listDirectoryOfAssetsMock.mockReset();
    listDirectoryOfAssetsMock.mockResolvedValue({ files: {} });
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
  });

  it('packages the files of a directory asset instead of the folder itself', async () => {
    vi.mocked(getTaskResult).mockResolvedValue(makeEFeatureResult('result-1'));
    listDirectoryOfAssetsMock.mockResolvedValue({
      files: {
        'IV_curve.png': { name: 'IV_curve.png', size: 10, last_modified: '' },
        'panels/step.png': { name: 'step.png', size: 20, last_modified: '' },
      },
    } as never);

    const entries = await collectFileEntries(getTaskResultFiles(['result-1']));

    expect(pathsOf(entries)).toEqual([
      'README.md',
      'data/0/extracted_features.json',
      'data/0/figures/IV_curve.png',
      'data/0/figures/panels/step.png',
      'metadata.json',
      'metadata.csv',
    ]);

    // a directory asset has no body of its own, so it is never downloaded by id
    const downloadedPaths = downloadAssetMock.mock.calls.map(
      ([args]: [{ assetPath?: string }]) => args.assetPath
    );
    expect(downloadedPaths).toEqual([undefined, 'IV_curve.png', 'panels/step.png']);
  });

  it('records each selected result in the metadata', async () => {
    vi.mocked(getTaskResult)
      .mockResolvedValueOnce(makeEFeatureResult('result-1'))
      .mockResolvedValueOnce(makeEFeatureResult('result-2'));

    const entries = await collectFileEntries(getTaskResultFiles(['result-1', 'result-2']));
    const metadataEntry = entries[entries.length - 2];
    const metadataJson = JSON.parse(await readEntryText(metadataEntry));

    expect(metadataJson).toHaveLength(2);
    expect(metadataJson[0]).toMatchObject({ id: 'result-1', idx: 0, data_path: 'data/0' });
    expect(metadataJson[1]).toMatchObject({
      id: 'result-2',
      idx: 1,
      data_path: 'data/1',
      task_result_type: 'efeature_extraction__result',
    });
  });

  it('keeps the archive when one asset cannot be fetched', async () => {
    vi.mocked(getTaskResult).mockResolvedValue(makeEFeatureResult('result-1'));
    downloadAssetMock.mockRejectedValueOnce(new Error('gone'));

    const entries = await collectFileEntries(getTaskResultFiles(['result-1']));

    expect(pathsOf(entries)).not.toContain('data/0/extracted_features.json');
    expect(pathsOf(entries)).toContain('metadata.json');
  });
});
