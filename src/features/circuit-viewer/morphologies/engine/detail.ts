/**
 * Which level of a pack each of its boxes is drawn at, for a view: the coarsest whose tolerance spans no more than a few
 * device pixels where the box comes nearest the eye, coarser still while what is in view is over the budget, and the
 * boxes farthest from the view's focus left out where even the coarsest is. Outside the view, a box is not drawn.
 */
import * as THREE from 'three';

import type { DetailRules, PackBoxes } from '../types';

/** The segments drawn at once until told otherwise. */
export const SEGMENT_BUDGET = 2_000_000;
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
  /** What the view turns about, in its own frame: the boxes nearest it are the last to go coarser or be left out. */
  focus: THREE.Vector3;
  /** Where the data's origin is in the view's frame. */
  shift: THREE.Vector3;
}

export interface Detail {
  /** Each box's level, -1 for a box not drawn. */
  levels: Int8Array;
  /** The boxes in view, the one nearest the focus first. */
  order: Uint32Array;
  /** What the levels chosen come to. */
  segments: number;
  /** The boxes in view left out for the budget. */
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

export function chooseDetail(
  { boxes, levels }: PackBoxes,
  view: DetailView,
  { budget, pixels }: DetailRules
): Detail {
  const count = boxes.length / 6;
  const chosen = new Int8Array(count).fill(-1);
  const away = new Float64Array(count);
  const inView: number[] = [];
  frustum.setFromProjectionMatrix(projected.multiplyMatrices(view.projection, view.view));
  const span = pixelSpan(view.projection, view.height);
  // The view matrix's row that gives a point's depth.
  const [, , zx, , , , zy, , , , zz, , , , zw] = view.view.elements;
  const coarsest = levels.length - 1;

  for (let b = 0; b < count; b++) {
    box.min.fromArray(boxes, 6 * b).add(view.shift);
    box.max.fromArray(boxes, 6 * b + 3).add(view.shift);
    box.expandByVector(box.getSize(middle).multiplyScalar(REACH));
    if (!frustum.intersectsBox(box)) continue;
    const { x: hx, y: hy, z: hz } = box.getSize(middle).multiplyScalar(0.5);
    box.getCenter(middle);
    // Where the box comes nearest the eye, as deep as the view sees it: its middle's depth less its reach towards it.
    const z = zx * middle.x + zy * middle.y + zz * middle.z + zw;
    const reach = Math.abs(zx) * hx + Math.abs(zy) * hy + Math.abs(zz) * hz;
    const pixelUm = view.orthographic ? span : span * Math.max(-(z + reach), 0);
    let level = coarsest;
    while (level > 0 && levels[level].toleranceUm > pixels * pixelUm) level--;
    chosen[b] = level;
    away[b] = middle.distanceTo(view.focus);
    inView.push(b);
  }

  const order = Uint32Array.from(inView).sort((a, b) => away[a] - away[b]);
  const segmentsOf = (b: number) => levels[chosen[b]].segments[b];
  let segments = 0;
  for (const b of order) segments += segmentsOf(b);
  // Coarser, a level at a time, the boxes farthest from the focus first.
  for (let coarser = true; segments > budget && coarser; ) {
    coarser = false;
    for (let i = order.length - 1; i >= 0 && segments > budget; i--) {
      const b = order[i];
      if (chosen[b] === coarsest) continue;
      segments -= segmentsOf(b);
      chosen[b]++;
      segments += segmentsOf(b);
      coarser = true;
    }
  }
  let leftOut = 0;
  for (let i = order.length - 1; i >= 0 && segments > budget; i--) {
    segments -= segmentsOf(order[i]);
    chosen[order[i]] = -1;
    leftOut++;
  }
  return { levels: chosen, order, segments, leftOut };
}
