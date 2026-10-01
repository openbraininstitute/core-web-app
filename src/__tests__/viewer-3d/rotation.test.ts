// @vitest-environment node
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { describe, expect, it } from 'vitest';

import { axisView } from '@/features/viewer-3d/engine/gizmo';
import { followScreenUp, stopGlide, turnCamera } from '@/features/viewer-3d/engine/rotation';

import { expectClose, screenUp } from './orientation-utils';

const target = new THREE.Vector3(10, 20, 30);

/** Controls wired as the viewer wires them, eased, the camera 100 µm in front of the target and upright. */
function orbit(): OrbitControls {
  const camera = new THREE.PerspectiveCamera();
  camera.position.copy(target).add(new THREE.Vector3(0, 0, 100));
  const controls = new OrbitControls(camera);
  controls.enableDamping = true;
  controls.target.copy(target);
  controls.addEventListener('change', () => followScreenUp(controls));
  controls.update();
  return controls;
}

/** The frames that ease out what the gestures asked for. */
function settle(controls: OrbitControls): void {
  for (let i = 0; i < 400; i++) controls.update();
}

/** A drag down `angle` radians long, in the small steps a pointer moves by. */
function dragDown(controls: OrbitControls, angle: number): void {
  for (let i = 0; i < 12; i++) controls.rotateUp(angle / 12);
  settle(controls);
}

const screenRight = (c: THREE.Camera) => new THREE.Vector3(1, 0, 0).applyQuaternion(c.quaternion);
const from = (c: THREE.Camera) => c.position.clone().sub(target).divideScalar(100);

describe('rotation', () => {
  it("turns about the screen's vertical on a sideways drag, from above, below and in between", () => {
    for (const down of [Math.PI / 2, -Math.PI / 2, Math.PI / 5]) {
      const controls = orbit();
      const camera = controls.object;
      dragDown(controls, down);
      const up = screenUp(camera.quaternion),
        right = screenRight(camera),
        start = from(camera);
      controls.rotateLeft(0.3);
      settle(controls);
      expectClose(screenUp(camera.quaternion), up);
      // The camera goes left, so the cell turns right with the pointer.
      expect(from(camera).sub(start).dot(right)).toBeLessThan(-0.1);
      expect(camera.position.distanceTo(target)).toBeCloseTo(100, 6);
      expectClose(camera.getWorldDirection(new THREE.Vector3()), from(camera).negate());
    }
  });

  it('goes on over the top on a drag down, without stopping at the pole', () => {
    const controls = orbit();
    dragDown(controls, Math.PI / 2);
    expectClose(from(controls.object), new THREE.Vector3(0, 1, 0));
    dragDown(controls, Math.PI);
    expectClose(from(controls.object), new THREE.Vector3(0, -1, 0));
    expectClose(screenRight(controls.object), new THREE.Vector3(1, 0, 0));
  });

  it("spins about the screen's vertical, seen from above too", () => {
    const controls = orbit();
    const camera = controls.object;
    dragDown(controls, Math.PI / 2);
    const up = screenUp(camera.quaternion);
    controls.autoRotate = true;
    for (let i = 0; i < 60; i++) controls.update();
    expectClose(screenUp(camera.quaternion), up);
    expect(Math.abs(from(camera).y)).toBeLessThan(0.99);
  });

  it('stops the easing of a turn, so a view set meanwhile stays put', () => {
    const controls = orbit();
    const camera = controls.object;
    controls.rotateLeft(0.5);
    controls.rotateUp(0.5);
    stopGlide(controls);
    const position = camera.position.clone(),
      quaternion = camera.quaternion.clone();
    settle(controls);
    expectClose(camera.position, position);
    expect(camera.quaternion.angleTo(quaternion)).toBeLessThan(1e-6);
  });

  it('turns to view from an axis and stays there, at the same distance, with the easing and the turntable on', () => {
    const controls = orbit();
    const camera = controls.object;
    controls.rotateLeft(0.4);
    controls.rotateUp(0.3);
    settle(controls);
    for (const [axis, sign, facing, up] of [
      [1, 1, new THREE.Vector3(0, 1, 0), null],
      [0, -1, new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)],
      [2, 1, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
    ] as const) {
      const start = camera.quaternion.clone();
      const end = axisView(axis, sign, start);
      stopGlide(controls);
      for (let i = 1; i <= 10; i++) {
        turnCamera(controls, start, end, i / 10);
        controls.update();
        expect(camera.position.distanceTo(target)).toBeCloseTo(100, 6);
      }
      settle(controls);
      expectClose(from(camera), facing);
      if (up) expectClose(screenUp(camera.quaternion), up);
      expect(camera.quaternion.angleTo(end)).toBeLessThan(1e-6);
    }
  });

  it('leaves a three without these fields to its plain turntable', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.up.set(0, 1, 0);
    camera.lookAt(0, -1, -1);
    const controls = { object: camera } as unknown as OrbitControls;
    expect(() => followScreenUp(controls)).not.toThrow();
    expect(() => stopGlide(controls)).not.toThrow();
    expectClose(camera.up, new THREE.Vector3(0, 1, 0));
  });
});
