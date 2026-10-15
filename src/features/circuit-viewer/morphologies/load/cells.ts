import type { CircuitMorphologyData, MorphologySegments, Population } from '../types';

/** The page's number of a cell of a population it has none of. */
const NONE = 0xffffffff;

/**
 * The page's number of each of a pack's cells, where the pack numbers them through `packed`, the populations it holds,
 * sorted by name, and the page through `populations`, its own in its order. A cell of a population the page has none of
 * gets `NONE`, as the page draws nothing of a population it could not place.
 */
export function pageCells(packed: Population[], populations: Population[]): Uint32Array {
  const places = new Map<string, { first: number; cells: number }>();
  let cells = 0;
  for (const population of populations) {
    places.set(population.name, { first: cells, cells: population.cells });
    cells += population.cells;
  }
  const numbers = new Uint32Array(packed.reduce((total, p) => total + p.cells, 0)).fill(NONE);
  let first = 0;
  for (const { name, cells: count } of packed) {
    const place = places.get(name);
    if (place) {
      if (place.cells !== count) {
        throw new Error(
          `morphology pack with ${count} cells in ${name}, where the page has ${place.cells}`
        );
      }
      for (let i = 0; i < count; i++) numbers[first + i] = place.first + i;
    }
    first += count;
  }
  return numbers;
}

/**
 * The data's somas, which the pack numbers, numbered as `numbers` says (`pageCells`), through `populations`: a cell of a
 * population the pack has none of gets a soma with no position, and a cell the page has no number for is left out.
 */
export function renumberSomas(
  data: CircuitMorphologyData,
  numbers: Uint32Array,
  populations: Population[]
): CircuitMorphologyData {
  const cells = populations.reduce((total, p) => total + p.cells, 0);
  const somas = new Float32Array(4 * cells).fill(NaN);
  for (let i = 3; i < somas.length; i += 4) somas[i] = 0;
  numbers.forEach((page, cell) => {
    if (page !== NONE) somas.set(data.somas.subarray(4 * cell, 4 * cell + 4), 4 * page);
  });
  return { ...data, somas, populations };
}

/**
 * Segments with their cells numbered as `numbers` says (`pageCells`), rewritten in place; those of a cell the page has
 * no number for are left out.
 */
export function renumberSegments(
  { segments, segmentCells, segmentTypes }: MorphologySegments,
  numbers: Uint32Array
): MorphologySegments {
  let kept = 0;
  for (let i = 0; i < segmentCells.length; i++) {
    const cell = numbers[segmentCells[i]];
    if (cell === NONE) continue;
    if (kept !== i) {
      segments.copyWithin(8 * kept, 8 * i, 8 * i + 8);
      segmentTypes[kept] = segmentTypes[i];
    }
    segmentCells[kept++] = cell;
  }
  if (kept === segmentCells.length) return { segments, segmentCells, segmentTypes };
  return {
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
