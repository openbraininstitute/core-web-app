// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  chooseDetail,
  type DetailView,
} from '@/features/circuit-viewer/morphologies/engine/detail';
import { BLOCK, roomFor } from '@/features/circuit-viewer/morphologies/engine/segment-arena';

import { boxesAt } from './boxes';

import type { DetailRules } from '@/features/circuit-viewer/morphologies/types';

const HEIGHT = 1000;
const RULES: DetailRules = { budget: Infinity, pixels: 2, culling: true };
/** Each segment counted alone against the budget. */
const bySegment = (segments: number) => segments;

/** A camera at the origin looking down -z, a 1000 device pixels high view. */
function viewOf(
  camera: THREE.Camera,
  focus = new THREE.Vector3(0, 0, -100),
  shift = new THREE.Vector3()
): DetailView {
  camera.updateMatrixWorld();
  return {
    projection: camera.projectionMatrix,
    view: camera.matrixWorldInverse,
    orthographic: camera instanceof THREE.OrthographicCamera,
    height: HEIGHT,
    focus,
    shift,
  };
}

const perspective = () => new THREE.PerspectiveCamera(60, 1, 0.1, 1e6);
/** The µm a device pixel spans at depth 1 in `perspective`. */
const SPAN = (2 * Math.tan(Math.PI / 6)) / HEIGHT;
/** The depth where a level's tolerance spans `pixels` device pixels, as near as the boxes of `boxesAt` come. */
const depthOf = (toleranceUm: number, pixels = 2) => toleranceUm / pixels / SPAN + 5;

describe('chooseDetail', () => {
  it("draws each box at the coarsest level whose tolerance spans 2 device pixels where it's nearest", () => {
    const depths = [depthOf(0.25) - 20, depthOf(0.25) + 20, depthOf(1) - 20, depthOf(1) + 20];
    const { levels, segments, leftOut } = chooseDetail(
      boxesAt(depths),
      viewOf(perspective()),
      RULES,
      bySegment
    );
    expect(Array.from(levels)).toEqual([0, 1, 1, 2]);
    expect(segments).toBe(100 + 50 + 50 + 10);
    expect(leftOut).toBe(0);
  });

  it('takes finer levels where a level may span fewer pixels', () => {
    const depths = [depthOf(1) + 20];
    const view = viewOf(perspective());
    expect(chooseDetail(boxesAt(depths), view, RULES, bySegment).levels[0]).toBe(2);
    expect(chooseDetail(boxesAt(depths), view, { ...RULES, pixels: 1 }, bySegment).levels[0]).toBe(
      1
    );
  });

  it('draws a box the eye is in at the finest level', () => {
    expect(chooseDetail(boxesAt([0]), viewOf(perspective()), RULES, bySegment).levels[0]).toBe(0);
  });

  it('draws every box at one level in an orthographic view, however deep', () => {
    // 2 µm a device pixel: the coarsest level spans half a pixel.
    const camera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, 0.1, 1e6);
    const { levels } = chooseDetail(boxesAt([10, 1000, 100_000]), viewOf(camera), RULES, bySegment);
    expect(Array.from(levels)).toEqual([2, 2, 2]);
  });

  it('draws no box outside the view, nor counts it left out', () => {
    const behind = boxesAt([-50, 100]);
    const { levels, order, leftOut } = chooseDetail(
      behind,
      viewOf(perspective()),
      RULES,
      bySegment
    );
    expect(Array.from(levels)).toEqual([-1, 0]);
    expect(Array.from(order)).toEqual([1]);
    expect(leftOut).toBe(0);
  });

  it('with a base, draws a box outside the view at the coarsest, and tells what every box comes to', () => {
    const { levels, order, segments, leftOut } = chooseDetail(
      boxesAt([-50, 100]),
      viewOf(perspective()),
      RULES,
      bySegment,
      true
    );
    expect(Array.from(levels)).toEqual([2, 0]);
    expect(Array.from(order)).toEqual([1]);
    expect(segments).toBe(10 + 100);
    expect(leftOut).toBe(0);
  });

  it('places the boxes where the shift puts them in the view', () => {
    const view = viewOf(perspective(), undefined, new THREE.Vector3(10_000, 0, 0));
    expect(Array.from(chooseDetail(boxesAt([100]), view, RULES, bySegment).levels)).toEqual([-1]);
  });

  it('draws a box a segment of it reaches into the view from just outside', () => {
    // The box's near side lies a quarter of its width beyond the view's edge at its depth.
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1e6);
    const depth = 100;
    const edge = depth * Math.tan(Math.PI / 6);
    const shift = new THREE.Vector3(edge + 2.5 + 5, 0, 0);
    expect(
      chooseDetail(boxesAt([depth]), viewOf(camera, undefined, shift), RULES, bySegment).levels[0]
    ).toBe(0);
    shift.x += 5;
    expect(
      chooseDetail(boxesAt([depth]), viewOf(camera, undefined, shift), RULES, bySegment).levels[0]
    ).toBe(-1);
  });

  it('orders the boxes in view by how near the focus they are', () => {
    const view = viewOf(perspective(), new THREE.Vector3(0, 0, -300));
    const { order } = chooseDetail(boxesAt([100, 300, 500, 250]), view, RULES, bySegment);
    expect(Array.from(order)).toEqual([1, 3, 0, 2]);
  });

  describe('over the budget', () => {
    // All at the finest level, the focus at the first.
    const depths = [10, 20, 30, 40];
    const view = () => viewOf(perspective(), new THREE.Vector3(0, 0, -10));

    it('goes coarser a level at a time, the boxes farthest from the focus first', () => {
      const { levels, segments, leftOut } = chooseDetail(
        boxesAt(depths),
        view(),
        { ...RULES, budget: 300 },
        bySegment
      );
      expect(Array.from(levels)).toEqual([0, 0, 1, 1]);
      expect(segments).toBe(300);
      expect(leftOut).toBe(0);
    });

    it('takes every box to the coarsest before it leaves any out', () => {
      const { levels, segments } = chooseDetail(
        boxesAt(depths),
        view(),
        { ...RULES, budget: 40 },
        bySegment
      );
      expect(Array.from(levels)).toEqual([2, 2, 2, 2]);
      expect(segments).toBe(40);
    });

    it('then leaves out every box in view, not those farthest from the focus alone', () => {
      const { levels, order, segments, leftOut } = chooseDetail(
        boxesAt(depths),
        view(),
        { ...RULES, budget: 39 },
        bySegment
      );
      expect(Array.from(levels)).toEqual([-1, -1, -1, -1]);
      expect(Array.from(order)).toEqual([0, 1, 2, 3]);
      expect(segments).toBe(40);
      expect(leftOut).toBe(4);
    });

    it('leaves out no box outside the view with them', () => {
      const { levels, leftOut } = chooseDetail(
        boxesAt([-50, ...depths]),
        view(),
        { ...RULES, budget: 39 },
        bySegment
      );
      expect(Array.from(levels)).toEqual([-1, -1, -1, -1, -1]);
      expect(leftOut).toBe(4);
    });

    it('with a base, counts the finer levels alone, and leaves no box out', () => {
      const base = (budget: number) =>
        chooseDetail(boxesAt(depths), view(), { ...RULES, budget }, bySegment, true);
      // Where the base did count, [1, 1, 2, 2].
      expect(Array.from(base(150).levels)).toEqual([1, 1, 1, 2]);
      const { levels, segments, leftOut } = base(0);
      expect(Array.from(levels)).toEqual([2, 2, 2, 2]);
      expect(segments).toBe(40);
      expect(leftOut).toBe(0);
    });

    it('counts the room each box takes against it, and tells its segments', () => {
      // Two blocks of room at the finest, one at the others.
      const { levels, segments, leftOut } = chooseDetail(
        boxesAt(depths),
        view(),
        { ...RULES, budget: 5 * BLOCK },
        roomFor
      );
      expect(Array.from(levels)).toEqual([0, 1, 1, 1]);
      expect(segments).toBe(100 + 3 * 50);
      expect(leftOut).toBe(0);
    });
  });
});
