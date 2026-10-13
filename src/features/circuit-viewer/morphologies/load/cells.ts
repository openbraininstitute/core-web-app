import type { CircuitMorphologyData, Population } from '../types';

const NONE = 0xffffffff;

/**
 * The data with its cells numbered through `populations`, the page's in the page's order, where the pack numbers them
 * through the populations it holds, sorted by name. `data`'s arrays are rewritten in place. A cell of a population the
 * pack has none of gets a soma with no position. The segments of a population the page has none of are left out, as
 * the page draws nothing of a population it could not place; `bounds` stay the pack's.
 */
export function renumberCells(
  data: CircuitMorphologyData,
  populations: Population[]
): CircuitMorphologyData {
  const places = new Map<string, { first: number; cells: number }>();
  let cells = 0;
  for (const population of populations) {
    places.set(population.name, { first: cells, cells: population.cells });
    cells += population.cells;
  }

  const somas = new Float32Array(4 * cells).fill(NaN);
  for (let i = 3; i < somas.length; i += 4) somas[i] = 0;
  const pageCell = new Uint32Array(data.somas.length / 4).fill(NONE);
  let first = 0;
  for (const { name, cells: count } of data.populations) {
    const place = places.get(name);
    if (place) {
      if (place.cells !== count) {
        throw new Error(
          `morphology pack with ${count} cells in ${name}, where the page has ${place.cells}`
        );
      }
      for (let i = 0; i < count; i++) pageCell[first + i] = place.first + i;
      somas.set(data.somas.subarray(4 * first, 4 * (first + count)), 4 * place.first);
    }
    first += count;
  }

  const { segments, segmentCells, segmentTypes } = data;
  let kept = 0;
  for (let i = 0; i < segmentCells.length; i++) {
    const cell = pageCell[segmentCells[i]];
    if (cell === NONE) continue;
    if (kept !== i) {
      segments.copyWithin(8 * kept, 8 * i, 8 * i + 8);
      segmentTypes[kept] = segmentTypes[i];
    }
    segmentCells[kept++] = cell;
  }
  const renumbered = { ...data, somas, populations };
  if (kept === segmentCells.length) return renumbered;
  return {
    ...renumbered,
    segments: segments.slice(0, 8 * kept),
    segmentCells: segmentCells.slice(0, kept),
    segmentTypes: segmentTypes.slice(0, kept),
  };
}

/**
 * Gives each cell the pack left without a soma, one of a population it does not hold, the page's own position and
 * `radius`, as the somas view draws it. `positions` are the page's, three floats a cell in the circuit's frame.
 * `data`'s somas and bounds are rewritten in place.
 */
export function fillSomas(
  data: CircuitMorphologyData,
  positions: Float32Array,
  radius: number
): void {
  const { somas, centre, bounds } = data;
  const cells = Math.min(somas.length / 4, positions.length / 3);
  for (let cell = 0; cell < cells; cell++) {
    if (!Number.isNaN(somas[4 * cell])) continue;
    if (!Number.isFinite(positions[3 * cell] + positions[3 * cell + 1] + positions[3 * cell + 2])) {
      continue;
    }
    for (let axis = 0; axis < 3; axis++) {
      const at = positions[3 * cell + axis] - centre[axis];
      somas[4 * cell + axis] = at;
      bounds.min[axis] = Math.min(bounds.min[axis], at - radius);
      bounds.max[axis] = Math.max(bounds.max[axis], at + radius);
    }
    somas[4 * cell + 3] = radius;
  }
}
