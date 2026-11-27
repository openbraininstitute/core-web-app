import { expect, it } from 'vitest';

import { limitTileOverlap, TILE_AXES } from './tile-overlap';

it('keeps the main icon at full size and clears an empty tile beneath it', () => {
  expect(
    limitTileOverlap([
      { x: 0, y: 0, r: 50, priority: 0 },
      { x: 0, y: 0, r: 100, priority: 3 },
    ])
  ).toEqual([0, 100]);
});

it('bounds overlap across a dense field, including enlarged hover radii', () => {
  const tiles = Array.from({ length: 60 }, (_, i) => ({
    x: (i % 10) * 95,
    y: Math.floor(i / 10) * 90,
    r: 35 + ((i * 17) % 90),
    priority: i % 4,
  }));
  const radii = limitTileOverlap(tiles);
  for (let i = 0; i < tiles.length; i++) {
    expect(radii[i]).toBeLessThanOrEqual(tiles[i].r + 1e-8);
    for (let j = 0; j < i; j++) {
      if (!radii[i] || !radii[j]) continue;
      const support = Math.sqrt(3) / 2;
      const separation = Math.max(
        ...TILE_AXES.map(([nx, ny]) =>
          Math.abs((tiles[i].x - tiles[j].x) * nx + (tiles[i].y - tiles[j].y) * ny)
        )
      );
      expect(separation + 1e-8).toBeGreaterThanOrEqual((radii[i] + radii[j]) * support);
    }
  }
});
