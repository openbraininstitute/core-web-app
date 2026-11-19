import { expect, test } from 'vitest';

import {
  ArtifactKind,
  artifactsOf,
  documentsOf,
  findLogFile,
  isTooLarge,
  kindOf,
  planFile,
  putHeadersOf,
  searchArtifacts,
  sha256Hex,
  shortPathOf,
  toLogFiles,
  UPLOAD_MAX_BYTES,
} from '@/features/logbook/api/log-files';
import { savedNameOf } from '@/features/logbook/shared/files';

test('the hash is the full SHA-256; the PUT sends the signed headers but Content-Length', async () => {
  const bytes = new TextEncoder().encode('rate plot v1');
  const sha256 = await sha256Hex(bytes.buffer);
  expect(sha256).toBe('426bb8ddb82528580792e49da7c0ec9e987fbc46cc4de49a127df3fc87863d41');
  const signed = {
    'If-None-Match': '*',
    'Content-Length': '12',
    'x-amz-checksum-sha256': 'Qmu43bglKFgHkuSdp8Dsnph/vEbMTeSaEn3z/IeGPUE=',
  };
  // The browser sets Content-Length itself.
  expect(putHeadersOf(signed)).toEqual({
    'If-None-Match': '*',
    'x-amz-checksum-sha256': 'Qmu43bglKFgHkuSdp8Dsnph/vEbMTeSaEn3z/IeGPUE=',
  });
  expect(putHeadersOf({})).toEqual({}); // a folder's first file: no conditions
});

test('a file is read and hashed once: its name and the hash sent to add-files agree', async () => {
  const file = new File(['rate plot v1'], 'rate.png');
  expect(await planFile(file)).toEqual({
    path: 'rate.426bb8ddb825.png',
    size: 12,
    sha256: '426bb8ddb82528580792e49da7c0ec9e987fbc46cc4de49a127df3fc87863d41',
  });
});

test('the upload limit is 100 MB by default, checked on the size alone', () => {
  expect(UPLOAD_MAX_BYTES).toBe(100 * 1024 * 1024);
  expect(isTooLarge(UPLOAD_MAX_BYTES)).toBe(false);
  expect(isTooLarge(UPLOAD_MAX_BYTES + 1)).toBe(true);
  expect(isTooLarge(11, 10)).toBe(true);
});

test('the short name drops the 12-hex hash part, and only that', () => {
  expect(shortPathOf('plots/rate.3fa9c1d2e4b7.png')).toBe('plots/rate.png');
  expect(shortPathOf('data/a.tar.3fa9c1d2e4b7.gz')).toBe('data/a.tar.gz');
  expect(shortPathOf('results/README.3fa9c1d2e4b7')).toBe('results/README');
  expect(shortPathOf('code/.env.3fa9c1d2e4b7')).toBe('code/.env');
  expect(shortPathOf('plots/rate.png')).toBe('plots/rate.png'); // saved before the hash rule
  expect(shortPathOf('plots/3fa9c1d2e4b7.png')).toBe('plots/3fa9c1d2e4b7.png'); // the stem is a hash
  expect(shortPathOf('plots/rate.3FA9C1D2E4B7.png')).toBe('plots/rate.3FA9C1D2E4B7.png'); // lower case only
});

test('an upload is saved under its content hash, before the extension', () => {
  const hash = '3fa9c1d2e4b7aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  // a web upload has no folder: saved at the top
  expect(savedNameOf('rate.png', hash)).toBe('rate.3fa9c1d2e4b7.png');
  expect(savedNameOf('a.tar.gz', hash)).toBe('a.tar.3fa9c1d2e4b7.gz');
  expect(savedNameOf('README', hash)).toBe('README.3fa9c1d2e4b7');
  expect(savedNameOf('.env', hash)).toBe('.env.3fa9c1d2e4b7');
  // an agent's file keeps its folder
  expect(savedNameOf('rate.png', hash, 'results/control')).toBe(
    'results/control/rate.3fa9c1d2e4b7.png'
  );
  for (const name of ['rate.png', 'a.tar.gz', 'README', '.env']) {
    expect(shortPathOf(savedNameOf(name, hash))).toBe(name);
    expect(shortPathOf(savedNameOf(name, hash, 'x'))).toBe(`x/${name}`);
  }
});

test('a page path finds its exact file, else the newest file of that short name', () => {
  const files = toLogFiles({
    files: {
      'plots/rate.aaaaaaaaaaaa.png': { name: 'x', size: 10, last_modified: '2026-11-14T10:00:00Z' },
      'plots/rate.bbbbbbbbbbbb.png': { name: 'x', size: 12, last_modified: '2026-11-15T10:00:00Z' },
      'results/rate.cccccccccccc.png': {
        name: 'x',
        size: 9,
        last_modified: '2026-11-16T10:00:00Z',
      },
    },
  });
  expect(files[0]).toEqual({
    path: 'plots/rate.aaaaaaaaaaaa.png',
    localPath: 'plots/rate.png',
    name: 'rate.png',
    size: 10,
    lastModified: '2026-11-14T10:00:00Z',
  });
  expect(findLogFile(files, 'plots/rate.aaaaaaaaaaaa.png')?.size).toBe(10);
  expect(findLogFile(files, 'plots/rate.png')?.size).toBe(12);
  expect(findLogFile(files, 'results/rate.png')?.size).toBe(9);
  expect(findLogFile(files, 'plots/missing.png')).toBeNull();
  expect(findLogFile([], 'plots/rate.png')).toBeNull();
});

test('artifacts: the published document first, then the files newest first, with their folder', () => {
  const artifacts = artifactsOf({
    folderId: 'f1',
    documents: [{ assetId: 'a1', path: 'main-dec1f50b.md', title: 'Main', pageId: 'p1', size: 10 }],
    files: toLogFiles({
      files: {
        'plots/rate.3fa9c1d2e4b7.png': {
          name: 'x',
          size: 5,
          last_modified: '2026-11-14T10:00:00Z',
        },
        'inputs/run.0123456789ab.py': { name: 'x', size: 7, last_modified: '2026-11-15T10:00:00Z' },
      },
    }),
  });
  expect(artifacts.map((a) => [a.id, a.name, a.where, a.kind])).toEqual([
    ['document:a1', 'Main', 'synced', ArtifactKind.Markdown],
    ['inputs/run.0123456789ab.py', 'run.py', 'inputs', ArtifactKind.Code],
    ['plots/rate.3fa9c1d2e4b7.png', 'rate.png', 'plots', ArtifactKind.Image],
  ]);
  expect(searchArtifacts(artifacts, ' RATE ').map((a) => a.name)).toEqual(['rate.png']);
  // The folder isn't shown, so it isn't searched.
  expect(searchArtifacts(artifacts, 'plots')).toEqual([]);
  expect(searchArtifacts(artifacts, '')).toHaveLength(3);
});

test('an artifact opens by its kind', () => {
  expect(['a.csv', 'b.PDF', 'c.mod', 'd.nwb', 'e.md'].map(kindOf)).toEqual([
    ArtifactKind.Table,
    ArtifactKind.Pdf,
    ArtifactKind.Code,
    ArtifactKind.Other,
    ArtifactKind.Markdown,
  ]);
});

test('a synced copy is named by its page title, else its file name, and knows its page', () => {
  const row = {
    path: 'exp-1-abc.md',
    size: 5,
    is_directory: false,
    label: 'research_log_document',
  };
  expect(
    documentsOf([
      {
        ...row,
        id: 'a1',
        meta: { logbook_page_title: 'Exp 1 — Morphology', logbook_page_id: 'p1' },
      },
      { ...row, id: 'a2', meta: null },
      { ...row, id: 'a3', meta: { logbook_page_title: '  ' } },
      { ...row, id: 'f1', label: 'research_log_files', is_directory: true },
    ]).map((d) => [d.assetId, d.title, d.pageId])
  ).toEqual([
    ['a1', 'Exp 1 — Morphology', 'p1'],
    ['a2', 'exp-1-abc.md', null],
    ['a3', 'exp-1-abc.md', null],
  ]);
});
