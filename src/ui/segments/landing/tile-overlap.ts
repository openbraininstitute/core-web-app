export const TILE_AXES = [0, 60, 120].map((angle) => [
  Math.cos((angle * Math.PI) / 180),
  Math.sin((angle * Math.PI) / 180),
]);

type Tile = {
  x: number;
  y: number;
  r: number;
  priority: number;
  supports?: readonly number[];
};

/** Reserve the actual projected faces, with icon tiles first. Separating face intervals
 * prevents overlap without the excessive gaps caused by circumscribed circles.
 * Shadows can still blend; the opaque faces remain within the requested 10% limit. */
export function limitTileOverlap(tiles: readonly Tile[]): number[] {
  const radii = tiles.map(() => 0);
  const reserved: Array<Tile & { supports: readonly number[] }> = [];
  const order = tiles
    .map((tile, index) => ({ ...tile, index }))
    .sort((a, b) => b.priority - a.priority || b.r - a.r);
  for (const tile of order) {
    const supports = tile.supports ?? [Math.sqrt(3) / 2, Math.sqrt(3) / 2, Math.sqrt(3) / 2];
    let radius = tile.r;
    for (const other of reserved) {
      const available = Math.max(
        ...TILE_AXES.map(
          ([nx, ny], axis) =>
            (Math.abs((tile.x - other.x) * nx + (tile.y - other.y) * ny) -
              other.r * other.supports[axis]) /
            supports[axis]
        )
      );
      radius = Math.max(0, Math.min(radius, available));
    }
    radii[tile.index] = radius;
    if (radius > 0)
      reserved.push({ x: tile.x, y: tile.y, r: radius, priority: tile.priority, supports });
  }
  return radii;
}
