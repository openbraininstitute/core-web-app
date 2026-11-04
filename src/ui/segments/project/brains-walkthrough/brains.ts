import * as THREE from 'three';

import type { Facing, FrameBox } from '@/features/viewer-3d/engine/scene-view';

/** The brain modeling course's brains: a fruit fly's, the mouse's, and a human's. */
export type TBrainMesh = 'fly' | 'root' | 'human' | 'rat';

type Vec3 = [number, number, number];

/** How far each of the course's brain meshes reaches, µm along (AP, DV, ML). */
const EXTENT: Record<TBrainMesh, { min: Vec3; max: Vec3 }> = {
  fly: { min: [0, 47, 72], max: [282, 458, 911] },
  root: { min: [-20, 140, 490], max: [13190, 7560, 10890] },
  human: { min: [40953, -193981, -200374], max: [221700, -58877, -55793] },
  rat: { min: [-39725, -17247, 993], max: [-7031, -3862, 18789] },
};

/**
 * A view's frame on one of the course's brains, from `facing`: the brain's own box, carried into the
 * view's frame by `place`, its corners to fit and the box round them. Known before the mesh is in,
 * so that the view is framed on the brain from its first frame.
 */
export function brainFrame(brain: TBrainMesh, place: THREE.Matrix4, facing: Facing): FrameBox {
  const { min, max } = EXTENT[brain];
  const placed = new THREE.Box3();
  const point = new THREE.Vector3();
  const points: number[] = [];
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) {
        point.set(x, y, z).applyMatrix4(place);
        placed.expandByPoint(point);
        points.push(point.x, point.y, point.z);
      }
  return { min: placed.min.toArray(), max: placed.max.toArray(), points, ...facing };
}

/**
 * From the course's fly brain, µm along (AP, DV, ML), into FlyWire's frame, FAFB14.1 µm, which the
 * FlyWire circuits keep: x across the brain, y down it, z from front to back.
 */
export const FLY_PLACE = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);

/** A brain drawn in its own frame. */
export const IN_PLACE = new THREE.Matrix4();

/** FlyWire's brain seen from in front, dorsal side up: its y runs down the brain and its z back. */
export const FLY_FRONT: Facing = { from: [0, 0, -1], up: [0, -1, 0] };

/** A course brain seen from in front, dorsal side up, in its own frame. */
export const COURSE_FRONT: Facing = { from: [-1, 0, 0], up: [0, -1, 0] };

/**
 * From the course's mouse brain (Allen CCFv3, µm along AP, DV, ML) into the frame of nbS1-HEX0-L6,
 * a rat's: its layer 6 put 1.3 mm under the surface of the right hindlimb somatosensory area, at
 * (6562, 1697, 7154), deep enough that the rat's taller dendrites stay in, its column along the
 * outward normal there, (-0.186, -0.959, 0.213), turned onto the circuit's own column axis,
 * (0.602, -0.143, 0.786), about its somas' middle.
 */
export const MOUSE_PLACE = new THREE.Matrix4().set(
  0.630976, -0.77027, -0.092487, 1389.374662,
  0.437477, 0.254819, 0.86237, -10625.171495,
  -0.64069, -0.584595, 0.49776, -1325.121172,
  0, 0, 0, 1
);

/** The mouse's brain from its right, above and a little in front, dorsal side up, in the circuit's frame. */
export const MOUSE_FACING: Facing = {
  from: inPlace(MOUSE_PLACE, new THREE.Vector3(-0.35, -0.75, 1)),
  up: inPlace(MOUSE_PLACE, new THREE.Vector3(0, -1, 0)),
};

/** A direction of a brain's own frame, (AP, DV, ML), where `place` carries it. */
function inPlace(place: THREE.Matrix4, direction: THREE.Vector3): [number, number, number] {
  return direction.normalize().transformDirection(place).toArray();
}

/**
 * Where H01 comes from in the course's human brain, µm along (AP, DV, ML): 2.5 mm into the lateral
 * surface of a temporal lobe, a third of the way back.
 */
export const H01_MARK: [number, number, number] = [108664, -107670, -197427];

/**
 * From the Waxholm rat brain (the rat.json mesh, µm along AP, DV, ML) into nbS1-HEX0-L6's frame, a
 * rat's own: its layer 6 put 1.7 mm under the surface of the right hindlimb somatosensory area, at
 * (-23170, -15005, 11806), its column along the outward normal there, (-0.224, -0.965, 0.136), turned
 * onto the circuit's column axis, about its somas' middle.
 */
export const RAT_PLACE = new THREE.Matrix4().set(
  0.601603, -0.784516, -0.15036, 7503.877501,
  0.441042, 0.169287, 0.881376, 1200.667662,
  -0.666, -0.596553, 0.447849, -32630.651298,
  0, 0, 0, 1
);

/** The rat's brain from its right, above and a little in front, dorsal side up, in the circuit's frame. */
export const RAT_FACING: Facing = {
  from: inPlace(RAT_PLACE, new THREE.Vector3(-0.35, -0.75, 1)),
  up: inPlace(RAT_PLACE, new THREE.Vector3(0, -1, 0)),
};

export const FLY_FRAME = brainFrame('fly', FLY_PLACE, FLY_FRONT);
export const MOUSE_FRAME = brainFrame('root', MOUSE_PLACE, MOUSE_FACING);
export const RAT_FRAME = brainFrame('rat', RAT_PLACE, RAT_FACING);

/**
 * nbS1-HEX0-L6 on its own, upright: framed on its column, from its somas' middle a little way up
 * towards the pia, where its dendrites reach, seen side on with the column's axis up the screen.
 */
export const L6_FRAME: FrameBox = {
  min: [2732, -2317, -3707],
  max: [4932, -117, -1507],
  from: [-0.7939, 0, 0.6081],
  up: [0.6019, -0.1425, 0.7858],
};

/**
 * The Male CNS's surface pack (male-cns-neurons.mpack), in its own µm: x across, y dorsal to ventral, z from the
 * front of the brain back along the nerve cord. Seen from below, the brain up the screen and the nerve cord
 * hanging under it, turning about the cord.
 */
export const CNS_FRAME: FrameBox = {
  min: [15.2, 36.9, 61.4],
  max: [752.1, 575.5, 1076.6],
  from: [0, 1, 0],
  up: [0, 0, -1],
};

/**
 * MICrONS_v1 upright, on its somas' box, in its own µm: x and z across the cortex, y down from the pia (at its least y)
 * to the white matter. Seen side on, the pia up the screen, turning about the cortex's depth.
 */
export const MICRONS_FRAME: FrameBox = {
  min: [523, 310, 603],
  max: [1323, 1093, 1105],
  from: [0, 0, 1],
  up: [0, -1, 0],
};

/** The cortical microcircuit's one colour in this walkthrough, the fly's brain's, and MICrONS's. */
export const L6_COLOR = '#e64980';
export const FLY_COLOR = '#2f9e44';
export const MICRONS_COLOR = '#7048e8';
