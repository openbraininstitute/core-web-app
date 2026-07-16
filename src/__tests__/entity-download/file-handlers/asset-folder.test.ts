import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { getAssetFolderFiles } from '@/features/entity-download/file-handlers/asset-folder';

import { collectFileEntries, pathsOf, readEntryText } from '../fixtures';
import { resetDownloadBoundaryMocks } from '../mock-boundaries';

const { downloadAssetMock, getSessionMock, listDirectoryMock } = vi.hoisted(() => {
  const downloadAssetMock = vi.fn(async ({ assetPath }: { assetPath?: string }) => {
    const buffer = Buffer.from(`content:${assetPath}`);
    return new Response(buffer, {
      headers: { 'content-length': String(buffer.length) },
    });
  });
  const getSessionMock = vi.fn(async () => ({
    user: { username: 'test-user' },
    accessToken: 'token',
  }));
  const listDirectoryMock = vi.fn();
  return { downloadAssetMock, getSessionMock, listDirectoryMock };
});

vi.mock('@/auth-fetch', () => ({ getSession: getSessionMock }));

vi.mock('@/api/entitycore/queries/assets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/entitycore/queries/assets')>();
  return {
    ...actual,
    downloadAsset: downloadAssetMock,
    listDirectoryOfAssets: listDirectoryMock,
  };
});

describe('getAssetFolderFiles', () => {
  beforeEach(() => {
    listDirectoryMock.mockReset();
    resetDownloadBoundaryMocks({ downloadAssetMock, getSessionMock });
    downloadAssetMock.mockImplementation(async ({ assetPath }: { assetPath?: string }) => {
      const buffer = Buffer.from(`content:${assetPath}`);
      return new Response(buffer, {
        headers: { 'content-length': String(buffer.length) },
      });
    });
  });

  it('yields files under a prefix with paths relative to that prefix', async () => {
    listDirectoryMock.mockResolvedValue({
      files: {
        'mechanisms/Na.mod': { name: 'Na.mod', size: 10, last_modified: '2024-01-01' },
        'mechanisms/K.mod': { name: 'K.mod', size: 12, last_modified: '2024-01-01' },
        'other/file.txt': { name: 'file.txt', size: 4, last_modified: '2024-01-01' },
      },
    });

    const entries = await collectFileEntries(
      getAssetFolderFiles({
        entityType: EntityTypeDict.Circuit,
        entityId: 'c1',
        assetId: 'dir1',
        prefix: './mechanisms',
      })
    );

    expect(pathsOf(entries).sort()).toEqual(['K.mod', 'Na.mod']);
    expect(await readEntryText(entries.find((e) => e.path === 'Na.mod')!)).toBe(
      'content:mechanisms/Na.mod'
    );
  });

  it('treats empty or root prefixes as matching every listed file', async () => {
    listDirectoryMock.mockResolvedValue({
      files: {
        'a.txt': { name: 'a.txt', size: 1, last_modified: '2024-01-01' },
        'b/c.txt': { name: 'c.txt', size: 2, last_modified: '2024-01-01' },
      },
    });

    const entries = await collectFileEntries(
      getAssetFolderFiles({
        entityType: EntityTypeDict.Circuit,
        entityId: 'c1',
        assetId: 'dir1',
        prefix: '/',
      })
    );

    expect(pathsOf(entries).sort()).toEqual(['a.txt', 'b/c.txt']);
  });

  it('skips files whose download response has no body', async () => {
    listDirectoryMock.mockResolvedValue({
      files: {
        'a.txt': { name: 'a.txt', size: 1, last_modified: '2024-01-01' },
        'b.txt': { name: 'b.txt', size: 1, last_modified: '2024-01-01' },
      },
    });

    downloadAssetMock.mockImplementation(async ({ assetPath }: { assetPath?: string }) => {
      if (assetPath === 'a.txt') {
        return new Response(null, { headers: { 'content-length': '0' } });
      }
      const buffer = Buffer.from('ok');
      return new Response(buffer, {
        headers: { 'content-length': String(buffer.length) },
      });
    });

    const entries = await collectFileEntries(
      getAssetFolderFiles({
        entityType: EntityTypeDict.Circuit,
        entityId: 'c1',
        assetId: 'dir1',
        prefix: '',
      })
    );

    expect(pathsOf(entries)).toEqual(['b.txt']);
  });
});
