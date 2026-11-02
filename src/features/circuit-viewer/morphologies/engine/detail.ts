/**
 * Which level of a pack each of its boxes is drawn at, for a view: the coarsest whose tolerance spans no more than a few
 * device pixels where the box comes nearest the eye, coarser still while what is in view is over the budget, and every
 * box in view left out where even the coarsest is. Outside the view, a box is not drawn; where every box's coarsest
 * level is kept drawn (a base), a box is drawn at least at it, which the budget does not count, and no finer than it
 * may be (by what is seen, where that is given). With `DetailRules.wholeFloor`, where every box at a level finer than the
 * coarsest fits the budget, every box is drawn at least at the finest such, in view or not.
 */
import * as THREE from 'three';

import type { DetailRules, PackBoxes } from '../types';

/** The segments drawn at once until told otherwise, by the tier that draws them; on WebGPU, finer than the base. */
export const SEGMENT_BUDGET = { webgl: 2_000_000, webgpu: 4_000_000 } as const;
/** How many device pixels a level's tolerance may span until told otherwise. */
export const DETAIL_PIXELS = 2;
/**
 * How far past its box a segment may reach, as a fraction of the box's side: a box holds the segments whose far end it
 * holds, and is drawn while it is this near the view.
 */
const REACH = 0.25;

export interface DetailView {
  projection: THREE.Matrix4;
  /** The inverse of the camera's world matrix. */
  view: THREE.Matrix4;
  orthographic: boolean;
  /** The view's height, in device pixels. */
  height: number;
  /** What the view turns about, in its own frame: the boxes nearest it are the last to go coarser. */
  focus: THREE.Vector3;
  /** Where the data's origin is in the view's frame. */
  shift: THREE.Vector3;
}

export interface Detail {
  /** Each box's level, -1 for a box not drawn. */
  levels: Int8Array;
  /** The boxes in view, and after them with a `floor` every other box, each the one nearest the focus first. */
  order: Uint32Array;
  /** How many of `order`, from its start, are in view. */
  inView: number;
  /**
   * The level every box is drawn at the least, in view or not, the finest finer than the coarsest that every box at fits
   * the budget (`DetailRules.wholeFloor`); -1 for none.
   */
  floor: number;
  /**
   * Of each box, 1 where it is in view and the pixels take it finer than the coarsest, or the floor, however fine it may
   * be (`finest`), before the budget; none where that is not given.
   */
  finer: Uint8Array;
  /**
   * Of a pack still coming in, 1 where a box drawn is drawn coarser than the pixels, or the floor, take it for what is
   * in.
   */
  capped?: Uint8Array;
  /**
   * What the levels chosen come to, of the boxes in `order`, or with a base of every box; where the boxes in view are
   * left out, what they come to at the coarsest.
   */
  segments: number;
  /** What the levels chosen take of the budget (`roomFor`), the base's aside; over it where the boxes are left out. */
  room: number;
  /** The boxes in view left out for the budget: none, or all of them. */
  leftOut: number;
}

/**
 * The µm a pixel spans as the shaders' `pixelUm` counts it, for a view `pixels` high: at a unit's depth in perspective,
 * and anywhere in an orthographic view.
 */
export function pixelSpan(projection: THREE.Matrix4, pixels: number): number {
  return 2 / (projection.elements[5] * pixels);
}

const box = new THREE.Box3();
const frustum = new THREE.Frustum();
const projected = new THREE.Matrix4();
const middle = new THREE.Vector3();
const half = new THREE.Vector3();

/**
 * `roomFor` gives what a box's segments take of the budget; `base`, whether every box's coarsest level is kept drawn;
 * `finest`, with a base, the finest level a box in view may be drawn at; `arrived`, of a pack still coming in, the
 * finest level of each box that is in, as if the pixels wanted no finer (beyond the coarsest where none is).
 */
export function chooseDetail(
  { boxes, levels }: PackBoxes,
  view: DetailView,
  { budget, pixels, wholeFloor }: DetailRules,
  roomFor: (segments: number) => number,
  base = false,
  finest?: (box: number) => number,
  arrived?: Int8Array
): Detail {
  const count = boxes.length / 6;
  const coarsest = levels.length - 1;
  const chosen = new Int8Array(count).fill(base ? coarsest : -1);
  const away = new Float64Array(count);
  const inView: number[] = [];
  const outOfView: number[] = [];
  const finer = new Uint8Array(count);
  const capped = arrived && new Uint8Array(count);
  const finestOf = base ? finest : undefined;
  // The coarsest a box is drawn at for the pixels or the budget: where finer than the coarsest, a floor for every box.
  const top = wholeFloor ? floorOf(levels, budget, roomFor) : coarsest;
  const floored = top < coarsest;
  frustum.setFromProjectionMatrix(projected.multiplyMatrices(view.projection, view.view));
  const span = pixelSpan(view.projection, view.height);
  // The view matrix's row that gives a point's depth.
  const [, , zx, , , , zy, , , , zz, , , , zw] = view.view.elements;

  for (let b = 0; b < count; b++) {
    box.min.fromArray(boxes, 6 * b).add(view.shift);
    box.max.fromArray(boxes, 6 * b + 3).add(view.shift);
    box.getCenter(middle);
    let level = top;
    box.expandByVector(box.getSize(half).multiplyScalar(REACH));
    if (frustum.intersectsBox(box)) {
      // At a floor of the finest, the pixels take no box elsewhere.
      if (top > 0) {
        const { x: hx, y: hy, z: hz } = box.getSize(half).multiplyScalar(0.5);
        // Where the box comes nearest the eye, as deep as the view sees it: its middle's depth less its reach towards it.
        const z = zx * middle.x + zy * middle.y + zz * middle.z + zw;
        const reach = Math.abs(zx) * hx + Math.abs(zy) * hy + Math.abs(zz) * hz;
        const pixelUm = view.orthographic ? span : span * Math.max(-(z + reach), 0);
        level = coarsest;
        while (level > 0 && levels[level].toleranceUm > pixels * pixelUm) level--;
        if (finestOf && level < top) {
          finer[b] = 1;
          level = Math.max(level, finestOf(b));
        }
        level = Math.min(level, top);
      }
      inView.push(b);
    } else if (floored) outOfView.push(b);
    else continue;
    if (arrived && capped && arrived[b] > level) {
      capped[b] = 1;
      level = Math.min(arrived[b], coarsest);
    }
    chosen[b] = level;
    away[b] = middle.distanceTo(view.focus);
  }

  const byAway = (a: number, b: number) => away[a] - away[b];
  // Those in view first, which are read first.
  const order = new Uint32Array(inView.length + outOfView.length);
  order.set(inView.sort(byAway));
  order.set(outOfView.sort(byAway), inView.length);
  const segmentsOf = (b: number) => levels[chosen[b]].segments[b];
  const roomOf = (b: number) => (base && chosen[b] === coarsest ? 0 : roomFor(segmentsOf(b)));
  let room = 0;
  for (const b of order) room += roomOf(b);
  // Coarser, a level at a time, the boxes farthest from the focus first.
  for (let coarser = true; room > budget && coarser; ) {
    coarser = false;
    for (let i = order.length - 1; i >= 0 && room > budget; i--) {
      const b = order[i];
      if (chosen[b] >= top) continue;
      room -= roomOf(b);
      chosen[b]++;
      room += roomOf(b);
      coarser = true;
    }
  }
  let segments = 0;
  if (base) for (let b = 0; b < count; b++) segments += segmentsOf(b);
  else for (const b of order) segments += segmentsOf(b);
  // A part of them would be cut at its boxes' sides, and another part as the view moves.
  const detail = {
    levels: chosen,
    order,
    inView: inView.length,
    floor: floored ? top : -1,
    finer,
    capped,
    segments,
    room,
  };
  if (room <= budget) return { ...detail, leftOut: 0 };
  for (const b of order) chosen[b] = -1;
  return { ...detail, leftOut: inView.length };
}

/** The finest level, finer than the coarsest, that every box at fits `budget`; the coarsest where none is. */
function floorOf(
  levels: PackBoxes['levels'],
  budget: number,
  roomFor: (segments: number) => number
): number {
  for (let level = 0; level < levels.length - 1; level++) {
    let room = 0;
    for (const segments of levels[level].segments) {
      room += roomFor(segments);
      if (room > budget) break;
    }
    if (room <= budget) return level;
  }
  return levels.length - 1;
}
