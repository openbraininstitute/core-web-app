import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { expect, it } from 'vitest';

import manifest from './media-manifest.json';

it('serves every migrated media URL from a complete local file', () => {
  const moved = manifest.assets.filter((asset) => 'local' in asset);
  expect(moved.length).toBeGreaterThan(0);
  for (const asset of moved) {
    if (!('local' in asset) || typeof asset.local !== 'string') continue;
    const file = join(process.cwd(), 'public', asset.local);
    expect(existsSync(file), asset.local).toBe(true);
    expect(statSync(file).size, asset.local).toBe(asset.bytes);
  }
});

it('uses only valid migrated media paths in the public content snapshots', () => {
  const paths = new Set(
    manifest.assets.flatMap((asset) => ('local' in asset ? [asset.local] : []))
  );
  const check = (value: unknown) => {
    if (typeof value === 'string' && value.startsWith('/static/website-media/')) {
      expect(paths.has(value), value).toBe(true);
    } else if (Array.isArray(value)) {
      value.forEach(check);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(check);
    }
  };
  for (const file of [
    'pages',
    'features',
    'metadata',
    'pricing',
    'widgets',
    'shared',
    'showcases',
    'gallery',
  ]) {
    check(
      JSON.parse(readFileSync(join(process.cwd(), `src/content/website/${file}.json`), 'utf8'))
    );
  }
});
