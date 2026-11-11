// @vitest-environment node
import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  clipRange,
  depthSpan,
  fitDistance,
  orbitRadius,
} from '@/features/viewer-3d/engine/framing';

describe('orbitRadius', () => {
  it('reaches the farthest corner of a box around the origin', () => {
    // Soma near one end: the far corner is (10, 40, 3), not the half diagonal.
    const box = new Box3(new Vector3(-10, -2, -3), new Vector3(4, 40, 1));
    expect(orbitRadius(box)).toBeCloseTo(Math.hypot(10, 40, 3), 9);
  });

  it('handles a box that does not contain the origin', () => {
    const box = new Box3(new Vector3(5, -9, 2), new Vector3(8, -6, 3));
    expect(orbitRadius(box)).toBeCloseTo(Math.hypot(8, 9, 3), 9);
  });

  it('is 0 for an empty box', () => {
    expect(orbitRadius(new Box3())).toBe(0);
  });
});

describe('clipRange', () => {
  it('moves the near plane in with the zoom', () => {
    // A projection neuron framed from 12 mm: a fixed near plane would stay at 12 µm.
    expect(clipRange(12000, 12000, 5000).near).toBeCloseTo(12, 9);
    expect(clipRange(5, 4000, 5000).near).toBeCloseTo(0.005, 9);
  });

  it('stops at the floor', () => {
    expect(clipRange(0.01, 4000, 5000).near).toBe(0.001);
    expect(clipRange(0, 0, 0)).toEqual({ near: 0.001, far: 0.002 });
  });

  it('keeps the whole scene in front of the far plane from anywhere', () => {
    // Zoomed in on a distal axon, the soma side is a cell's width away.
    expect(clipRange(5, 4000, 5000).far).toBeGreaterThan(9000);
    // Dollied far out: the cell stays in view.
    expect(clipRange(1e6, 1e6, 5000).far).toBeGreaterThan(1e6 + 5000);
  });
});

describe('depthSpan', () => {
  // A camera on the z axis 100 µm out, looking at the origin.
  const eye = { x: 0, y: 0, z: 100 },
    dir = { x: 0, y: 0, z: -1 };

  it("spans the points' depths when they lie within reach of the target", () => {
    expect(depthSpan([5, 0, 10, 0, -5, -20], eye, dir, 100)).toEqual({ near: 90, far: 120 });
  });

  it('spreads over what lies around the target when the points reach farther', () => {
    expect(depthSpan([0, 0, 90, 0, 0, -90], eye, dir, 100)).toEqual({ near: 60, far: 140 });
  });

  it('falls back to the window around the target when no point is in it', () => {
    expect(depthSpan([0, 0, 1000], eye, dir, 100)).toEqual({ near: 60, far: 140 });
    expect(depthSpan([], eye, dir, 100)).toEqual({ near: 60, far: 140 });
  });

  it("takes the window from the reach where the camera's distance does not follow the zoom", () => {
    // An orthographic camera 100 µm out, zoomed in as a perspective camera 25 µm out would be.
    expect(depthSpan([0, 0, 90, 0, 0, -90], eye, dir, 100, 25)).toEqual({ near: 90, far: 110 });
  });
});

describe('fitDistance', () => {
  const tan = Math.tan(Math.PI / 8);

  it('brings the farthest-reaching side to the edge, whatever the others do', () => {
    // Soma near the bottom: the cell reaches 100 up, 10 down. The top decides, not the farthest corner of a box.
    const d = fitDistance([0, 100, 0, 0, -10, 0, 20, 0, 0], tan, tan, 1);
    expect(d).toBeCloseTo(100 / tan, 9);
    expect(100 / (d * tan)).toBeCloseTo(1, 9);
  });

  it('uses the wider field for a wide view', () => {
    expect(fitDistance([100, 0, 0], 2 * tan, tan, 1)).toBeCloseTo(50 / tan, 9);
    expect(fitDistance([0, 100, 0], 2 * tan, tan, 1)).toBeCloseTo(100 / tan, 9);
  });

  it('steps back for points nearer the camera and leaves the margin', () => {
    expect(fitDistance([0, 100, 30], tan, tan, 1)).toBeCloseTo(30 + 100 / tan, 9);
    expect(fitDistance([0, 100, 0], tan, tan, 0.9)).toBeCloseTo(100 / (0.9 * tan), 9);
  });

  it('keeps a gap in front of a point on the axis, and is 0 without points', () => {
    expect(fitDistance([0, 0, 50], tan, tan, 1, 5)).toBe(55);
    expect(fitDistance([], tan, tan, 1)).toBe(0);
  });
});
