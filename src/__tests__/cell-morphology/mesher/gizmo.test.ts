// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  type Axis,
  axisView,
  gizmoTips,
  orientationFrom,
  type Sign,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/gizmo';

import { expectClose, screenUp } from './mesh-utils';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const neg = (v: THREE.Vector3) => v.clone().negate();
const front = orientationFrom(Z, Y);

const facing = (q: THREE.Quaternion) => new THREE.Vector3(0, 0, 1).applyQuaternion(q);

function tipAt(q: THREE.Quaternion, axis: Axis, sign: Sign) {
  const tip = gizmoTips(q).find((t) => t.axis === axis && t.sign === sign);
  if (!tip) throw new Error('no tip');
  return new THREE.Vector3(tip.x, tip.y, tip.depth);
}

describe('gizmo', () => {
  it('shows X right, Y up and Z towards the viewer from the front, back to front', () => {
    expectClose(tipAt(front, 0, 1), X);
    expectClose(tipAt(front, 1, 1), Y);
    expectClose(tipAt(front, 2, 1), Z);
    expectClose(tipAt(front, 0, -1), neg(X));
    const tips = gizmoTips(front);
    expect(tips).toHaveLength(6);
    const depths = tips.map((t) => t.depth);
    expect(depths).toEqual([...depths].sort((a, b) => a - b));
    expect(tips.at(0)).toMatchObject({ axis: 2, sign: -1 });
    expect(tips.at(-1)).toMatchObject({ axis: 2, sign: 1 });
  });

  it('follows the camera round: from +X, Z is on the left', () => {
    const q = orientationFrom(X, Y);
    expectClose(tipAt(q, 0, 1), Z);
    expectClose(tipAt(q, 2, 1), neg(X));
    expectClose(tipAt(q, 1, 1), Y);
  });

  it('views from the tip clicked, upright from the side', () => {
    for (const [axis, sign, from] of [
      [0, 1, X],
      [0, -1, neg(X)],
      [2, -1, neg(Z)],
    ] as const) {
      const q = axisView(axis, sign, orientationFrom(new THREE.Vector3(1, 0.5, 2).normalize(), Y));
      expectClose(facing(q), from);
      expectClose(screenUp(q), Y);
    }
  });

  it('tips the view over the top or under, from the front to Y', () => {
    const above = axisView(1, 1, front);
    expectClose(facing(above), Y);
    expectClose(screenUp(above), neg(Z));
    const below = axisView(1, -1, front);
    expectClose(facing(below), neg(Y));
    expectClose(screenUp(below), Z);
  });

  it('keeps the side that was up when turning to Y from a side view', () => {
    const q = axisView(1, 1, orientationFrom(X, Y));
    expectClose(facing(q), Y);
    expectClose(screenUp(q), neg(X));
  });

  it('views from the opposite tip when the camera already faces the one clicked', () => {
    const q = axisView(2, 1, front);
    expectClose(facing(q), neg(Z));
    expectClose(screenUp(q), Y);
    expectClose(facing(axisView(1, 1, axisView(1, 1, front))), neg(Y));
  });
});
