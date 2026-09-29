import * as THREE from 'three';

export type Axis = 0 | 1 | 2;
export type Sign = 1 | -1;

/** The end of one of the six half-axes as the camera sees it: right and up on the screen, and towards the viewer. */
export interface GizmoTip {
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

/** The six tips seen by a camera of this orientation, back to front. */
export function gizmoTips(orientation: Readonly<THREE.Quaternion>): GizmoTip[] {
  const { x, y, z, w } = orientation;
  const toView = new THREE.Quaternion(-x, -y, -z, w);
  const tips: GizmoTip[] = [];
  for (const sign of [1, -1] as const) {
    for (const axis of [0, 1, 2] as const) {
      const v = unit(axis, sign).applyQuaternion(toView);
      tips.push({ axis, sign, x: v.x, y: v.y, depth: v.z });
    }
  }
  return tips.sort((a, b) => a.depth - b.depth);
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
  let best = new THREE.Quaternion();
  let bestAngle = Infinity;
  for (const up of ups) {
    const q = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(from, ORIGIN, up)
    );
    const angle = q.angleTo(current);
    if (angle < bestAngle) {
      best = q;
      bestAngle = angle;
    }
  }
  return best;
}
