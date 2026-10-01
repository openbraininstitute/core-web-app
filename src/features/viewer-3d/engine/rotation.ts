import * as THREE from 'three';

import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** OrbitControls' own fields used here, optional so that a three renaming them falls back to its plain turntable. */
interface Internals {
  _quat?: THREE.Quaternion;
  _quatInverse?: THREE.Quaternion;
  _sphericalDelta?: THREE.Spherical;
  _panOffset?: THREE.Vector3;
}

const Y = new THREE.Vector3(0, 1, 0);

/** Keep OrbitControls' turntable, whose axis it reads from `camera.up` only once, on the screen's vertical. */
export function followScreenUp(controls: OrbitControls): void {
  const { _quat, _quatInverse } = controls as unknown as Internals;
  if (!_quat || !_quatInverse) return;
  const camera = controls.object;
  camera.up.copy(Y).applyQuaternion(camera.quaternion);
  _quat.setFromUnitVectors(camera.up, Y);
  _quatInverse.copy(_quat).invert();
}

/** Drop what is left of OrbitControls' easing, so that a view set now stays put. */
export function stopGlide(controls: OrbitControls): void {
  const { _sphericalDelta, _panOffset } = controls as unknown as Internals;
  _sphericalDelta?.set(0, 0, 0);
  _panOffset?.set(0, 0, 0);
}

/** Put the camera `t` of the way along an eased turn about the target between two orientations, as far from it as it is. */
export function turnCamera(
  controls: OrbitControls,
  from: THREE.Quaternion,
  to: THREE.Quaternion,
  t: number
): void {
  const camera = controls.object;
  const target = controls.target;
  const d = camera.position.distanceTo(target);
  camera.quaternion.slerpQuaternions(from, to, THREE.MathUtils.smoothstep(t, 0, 1));
  camera.position.set(0, 0, d).applyQuaternion(camera.quaternion).add(target);
  followScreenUp(controls);
}
