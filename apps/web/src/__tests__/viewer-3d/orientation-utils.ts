import * as THREE from 'three';
import { expect } from 'vitest';

export const screenUp = (orientation: THREE.Quaternion): THREE.Vector3 =>
  new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);

export function expectClose(a: THREE.Vector3, b: THREE.Vector3): void {
  expect(a.distanceTo(b)).toBeLessThan(1e-6);
}
