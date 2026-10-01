import * as THREE from 'three';

export type Axis = 0 | 1 | 2;
export type Sign = 1 | -1;

/** The six half-axes: +X, +Y, +Z, then −X, −Y, −Z. */
export const TIPS = ([1, -1] as const).flatMap((sign) =>
  ([0, 1, 2] as const).map((axis) => ({ axis, sign }))
);

/** The end of `TIPS[index]` as the camera sees it: right and up on the screen, and towards the viewer. */
export interface GizmoTip {
  index: number;
  axis: Axis;
  sign: Sign;
  x: number;
  y: number;
  depth: number;
}

const ORIGIN = new THREE.Vector3();

function unit(axis: Axis, sign: Sign): THREE.Vector3 {
  return new THREE.Vector3().setComponent(axis, sign);
}

/** The orientation of a camera looking at the origin from `from`, with `up` up on the screen. */
export function orientationFrom(from: THREE.Vector3, up: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(from, ORIGIN, up));
}

/** The six tips seen by a camera of this orientation, back to front. */
export function gizmoTips(orientation: Readonly<THREE.Quaternion>): GizmoTip[] {
  const toView = new THREE.Quaternion().copy(orientation).invert();
  return TIPS.map(({ axis, sign }, index) => {
    const v = unit(axis, sign).applyQuaternion(toView);
    return { index, axis, sign, x: v.x, y: v.y, depth: v.z };
  }).sort((a, b) => a.depth - b.depth);
}

/**
 * The orientation of a camera that looks at the target from the tip of `axis`, or from the opposite tip when it
 * already does. Seen from the side the world's Y is up; seen along Y, whichever of X and Z turns the view the least.
 */
export function axisView(
  axis: Axis,
  sign: Sign,
  current: Readonly<THREE.Quaternion>
): THREE.Quaternion {
  const from = unit(axis, sign);
  const facing = new THREE.Vector3(0, 0, 1).applyQuaternion(current);
  if (from.dot(facing) > 1 - 1e-4) from.negate();
  const ups = axis === 1 ? [unit(0, 1), unit(0, -1), unit(2, 1), unit(2, -1)] : [unit(1, 1)];
  return ups
    .map((up) => orientationFrom(from, up))
    .reduce((best, q) => (q.angleTo(current) < best.angleTo(current) ? q : best));
}
