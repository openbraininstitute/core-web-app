import { existsSync, statSync } from 'node:fs';

import { expect, it } from 'vitest';

import { optimizedMedia } from './optimized-media';
import manifest from './optimized-media.json';

it('ships every optimized asset and reduces the automatic tour to under 1.5 MB', () => {
  let previews = 0;
  for (const variants of Object.values(manifest)) {
    for (const [variant, file] of Object.entries(variants)) {
      expect(existsSync(`public${file.src}`), file.src).toBe(true);
      expect(statSync(`public${file.src}`).size).toBe(file.bytes);
      expect(file.bytes).toBeLessThanOrEqual(file.originalBytes);
      if (variant === 'preview') previews += file.bytes;
    }
  }
  expect(previews).toBeGreaterThan(0);
  expect(previews).toBeLessThan(1_500_000);
});

it('resolves legacy cache versions and leaves unknown URLs intact', () => {
  expect(optimizedMedia('/static/landing-v1/dendrite-ride.mp4?v=3', 'preview')).toContain(
    'preview-'
  );
  expect(optimizedMedia('/unknown.mp4')).toBe('/unknown.mp4');
});
