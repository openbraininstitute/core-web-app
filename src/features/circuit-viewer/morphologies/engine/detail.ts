/**
 * Chooses the level each box of a pack is drawn at, for a view. A box gets the coarsest level whose tolerance spans no
 * more than a few device pixels where the box comes nearest the eye. Boxes go coarser while what is in view is over the
 * budget, and every box in view is left out if even the coarsest levels are over it. A box outside the view is not
 * drawn. Where every box's coarsest level is kept drawn (a base), every box is drawn at least at that level, which the
 * budget does not count, and no finer than it may be (by what is seen, where that is given). With
 * `DetailRules.wholeFloor`, if every box fits the budget at some level finer than the coarsest, every box, in view or
 * not, is drawn at least at the finest such level.
 */
import * as THREE from 'three';

import type { DetailRules, PackBoxes } from '../types';

/** The default budget of segments drawn at once, by tier. On WebGPU it counts only those finer than the base. */
export const SEGMENT_BUDGET = { webgl: 2_000_000, webgpu: 4_000_000 } as const;
/** The default number of device pixels a level's tolerance may span. */
export const DETAIL_PIXELS = 2;
/**
 * How far past its box a segment may reach, as a fraction of the box's side: a box holds the segments whose far end
 * lies in it, so it is drawn while it is within this reach of the view.
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
  /** The boxes in view, then, with a `floor`, every other box; each group nearest the focus first. */
  order: Uint32Array;
  /** How many of `order`, from its start, are in view. */
  inView: number;
  /**
   * The level every box is drawn at or finer, in view or not: the finest level, finer than the coarsest, at which every
   * box fits the budget (`DetailRules.wholeFloor`). -1 for none.
   */
  floor: number;
  /**
   * For each box, 1 where it is in view and the pixels want it finer than the coarsest level, or than the floor,
   * whatever `finest` allows, before the budget applies. All 0 where `finest` is not given.
   */
  finer: Uint8Array;
  /**
   * For a pack still coming in: 1 where a box is drawn coarser than the pixels, or the floor, would take it, because
   * only that much of it is in.
   */
  capped?: Uint8Array;
  /**
   * The segments the levels chosen come to: of the boxes in `order`, or with a base, of every box. Where the boxes in
   * view are left out, what they would come to at the coarsest.
   */
  segments: number;
  /** How much of the budget the levels chosen take (`roomFor`), the base aside; over it where boxes are left out. */
  room: number;
  /** How many boxes in view are left out for the budget: none, or all of them. */
  leftOut: number;
}

/**
 * How many µm a pixel spans, as the shaders' `pixelUm` counts it, in a view `pixels` high: at unit depth in
 * perspective, and anywhere in an orthographic view.
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
 * `roomFor` gives how much of the budget a box's segments take; `base`, whether every box's coarsest level is kept
 * drawn; `finest`, with a base, the finest level a box in view may be drawn at; `arrived`, for a pack still coming in,
 * the finest level of each box that is in (past the coarsest where none is), treated as if the pixels wanted no finer.
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
  // The coarsest level the pixels or the budget can take a box to. Finer than the coarsest, it is every box's floor.
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
      // With the finest level as the floor, the pixels cannot change any box's level.
      if (top > 0) {
        const { x: hx, y: hy, z: hz } = box.getSize(half).multiplyScalar(0.5);
        // The depth where the box comes nearest the eye: its middle's depth less its reach towards the eye.
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
  // Those in view come first, and are read first.
  const order = new Uint32Array(inView.length + outOfView.length);
  order.set(inView.sort(byAway));
  order.set(outOfView.sort(byAway), inView.length);
  const segmentsOf = (b: number) => levels[chosen[b]].segments[b];
  const roomOf = (b: number) => (base && chosen[b] === coarsest ? 0 : roomFor(segmentsOf(b)));
  let room = 0;
  for (const b of order) room += roomOf(b);
  // Take boxes coarser one level at a time, those farthest from the focus first.
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
  // Over the budget, every box in `order` is left out: leaving out only some would cut the morphologies at those
  // boxes' sides, and at other boxes' sides as the view moves.
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

/** The finest level, finer than the coarsest, at which every box fits `budget`; the coarsest where no level does. */
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
