import { describe, expect, it } from 'vitest';

import { AssetContentType, AssetLabel, AssetStatus } from '@/api/entitycore/types/shared/global';
import {
  buildDirectoryLevel,
  inferContentType,
  isDirectoryAsset,
  makeDirectoryChildFile,
  parentPrefix,
} from '@/features/scan-config/components/file-viewer/directory-entries';

import type { DirectoryListContent, IAsset } from '@/api/entitycore/types/shared/global';
import type { TActivityCustomFile } from '@/features/scan-config/types';

const listing: DirectoryListContent['files'] = {
  'summary.png': { name: 'summary.png', size: 100, last_modified: '2026-08-04T00:00:00Z' },
  'notes.unknown': { name: 'notes.unknown', size: 10, last_modified: '2026-08-04T00:00:00Z' },
  'panels/IV_curve.png': { name: 'IV_curve.png', size: 200, last_modified: '2026-08-04T00:00:00Z' },
  'panels/traces/step.png': { name: 'step.png', size: 300, last_modified: '2026-08-04T00:00:00Z' },
};

const directoryAsset = {
  id: 'asset-1',
  path: 'figures',
  full_path: 'private/p/assets/task_result/r/figures',
  bucket_name: 'bucket',
  is_directory: true,
  content_type: AssetContentType.directory,
  size: -1,
  label: AssetLabel.efeature_extraction_figures,
  status: AssetStatus.CREATED,
} satisfies Partial<IAsset> as IAsset;

const entity = { id: 'entity-1', type: 'task_result' } as TActivityCustomFile['entity'];

describe('directory listing entries', () => {
  it('splits a flat listing into the folders and files of one level', () => {
    const level = buildDirectoryLevel(listing);

    expect(level.folders).toEqual([
      { name: 'panels', prefix: 'panels/', fileCount: 2, totalSize: 500 },
    ]);
    expect(level.files.map((file) => file.name)).toEqual(['notes.unknown', 'summary.png']);
  });

  it('lists a nested level relative to its prefix', () => {
    const level = buildDirectoryLevel(listing, 'panels/');

    expect(level.folders.map((folder) => folder.name)).toEqual(['traces']);
    expect(level.files).toEqual([
      {
        name: 'IV_curve.png',
        path: 'panels/IV_curve.png',
        size: 200,
        contentType: AssetContentType.png,
      },
    ]);
  });

  it('leaves an unknown extension without a content type so it renders as a placeholder', () => {
    const level = buildDirectoryLevel(listing);
    const unknown = level.files.find((file) => file.name === 'notes.unknown');

    expect(unknown?.contentType).toBeUndefined();
    expect(inferContentType('trace.json')).toBe(AssetContentType.json);
    expect(inferContentType('README')).toBeUndefined();
  });

  it('walks back up one level at a time', () => {
    expect(parentPrefix('panels/traces/')).toBe('panels/');
    expect(parentPrefix('panels/')).toBe('');
    expect(parentPrefix('')).toBe('');
  });

  it('keeps the directory asset id on a child file and selects it by path', () => {
    const entry = buildDirectoryLevel(listing, 'panels/').files[0];
    const child = makeDirectoryChildFile({ asset: directoryAsset, entity, entry });

    // the download and presigned-url endpoints key on the directory's asset id, with asset_path
    // choosing the file inside it
    expect(child.asset.id).toBe(directoryAsset.id);
    expect(child.assetPath).toBe('panels/IV_curve.png');
    expect(child.asset.is_directory).toBe(false);
    expect(child.asset.content_type).toBe(AssetContentType.png);
    expect(child.id).not.toBe(directoryAsset.id);
  });

  it('does not type a child of unknown format as a directory', () => {
    // inheriting the parent's `application/vnd.directory` would send the viewer back into the
    // folder listing instead of the unsupported-format placeholder
    const entry = buildDirectoryLevel(listing).files.find((file) => file.name === 'notes.unknown');
    const child = makeDirectoryChildFile({
      asset: directoryAsset,
      entity,
      // biome-ignore lint/style/noNonNullAssertion: the entry is in the fixture listing
      entry: entry!,
    });

    expect(isDirectoryAsset(child.asset)).toBe(false);
    expect(child.asset.content_type).not.toBe(AssetContentType.directory);
  });

  it('recognises a directory asset from either flag', () => {
    expect(isDirectoryAsset(directoryAsset)).toBe(true);
    expect(
      isDirectoryAsset({ is_directory: false, content_type: AssetContentType.directory })
    ).toBe(true);
    expect(isDirectoryAsset({ is_directory: false, content_type: AssetContentType.png })).toBe(
      false
    );
  });
});
