import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ATLAS_ZOOM, morphAtlasOnCompositor } from '@/ui/segments/explore/atlas-morph';

import type { ViewTransitionInstance } from 'react';

// jsdom has neither: a keyframe effect that records its keyframes, and translate-only matrices
class FakeKeyframeEffect {
  constructor(public keyframes: Keyframe[]) {}

  getKeyframes() {
    return this.keyframes;
  }

  setKeyframes(keyframes: Keyframe[]) {
    this.keyframes = keyframes;
  }

  getComputedTiming() {
    return { duration: 300 };
  }
}

class FakeMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;

  constructor(transform: string) {
    [this.a, this.b, this.c, this.d, this.e, this.f] = (transform.match(/-?[\d.]+/g) ?? []).map(
      Number
    );
  }
}

/** The browser's own morph from the mini card (329×140) to the full atlas (1001×790). */
function morphInstance(from = 'matrix(1, 0, 0, 1, 18.5, 88.5)') {
  const box = new FakeKeyframeEffect([
    { offset: 0, transform: from, width: '329px', height: '140px' },
    { offset: 1, transform: 'matrix(1, 0, 0, 1, 368.5, 85)', width: '1001px', height: '790px' },
  ]);
  // each view's fade, as the browser makes it
  const fades = {
    old: new FakeKeyframeEffect([{ opacity: 1 }, { opacity: 0 }]),
    new: new FakeKeyframeEffect([{ opacity: 0 }, { opacity: 1 }]),
  };
  const view = (name: 'old' | 'new') => ({ getAnimations: () => [{ effect: fades[name] }] });
  const instance = {
    group: { getAnimations: () => [{ effect: box }] },
    old: view('old'),
    new: view('new'),
  } as unknown as ViewTransitionInstance;
  const scales = {
    get old() {
      return fades.old.keyframes;
    },
    get new() {
      return fades.new.keyframes;
    },
  };
  return { instance, box, scales };
}

const numbers = (transform: unknown) =>
  (String(transform).match(/-?[\d.]+(e-?\d+)?/g) ?? []).map(Number);

beforeEach(() => {
  vi.stubGlobal('KeyframeEffect', FakeKeyframeEffect);
  vi.stubGlobal('DOMMatrixReadOnly', FakeMatrix);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('morphAtlasOnCompositor', () => {
  it('moves the box with a transform only, from the old box to the new one', () => {
    const { instance, box } = morphInstance();
    morphAtlasOnCompositor(instance, { from: ATLAS_ZOOM.mini, to: ATLAS_ZOOM.full });

    expect(box.keyframes.every((k) => Object.keys(k).join() === 'offset,transform')).toBe(true);
    const [x0, y0, sx0, sy0] = numbers(box.keyframes[0].transform);
    expect([x0, y0]).toEqual([18.5, 88.5]);
    expect(sx0).toBeCloseTo(329 / 1001);
    expect(sy0).toBeCloseTo(140 / 790);
    expect(numbers(box.keyframes.at(-1)?.transform)).toEqual([368.5, 85, 1, 1]);
  });

  it('keeps both brains the same size and undistorted, each true to its own view at its end', () => {
    const { instance, box, scales } = morphInstance();
    morphAtlasOnCompositor(instance, { from: ATLAS_ZOOM.mini, to: ATLAS_ZOOM.full });

    box.keyframes.forEach((frame, i) => {
      const [, , sx, sy] = numbers(frame.transform);
      const [ox, oy] = numbers(scales.old[i].transform);
      const [nx, ny] = numbers(scales.new[i].transform);
      // on screen a view scales by the box's scale times its own
      expect(ox * sx).toBeCloseTo(oy * sy);
      expect(nx * sx).toBeCloseTo(ny * sy);
      // a brain is as tall as its view times its zoom: the mini's and the full's match
      expect(oy * sy * 140 * ATLAS_ZOOM.mini).toBeCloseTo(ny * sy * 790 * ATLAS_ZOOM.full);
    });
    const [ox0, oy0] = numbers(scales.old[0].transform);
    const [, , sx0, sy0] = numbers(box.keyframes[0].transform);
    expect([ox0 * sx0, oy0 * sy0].map((s) => s.toFixed(6))).toEqual(['1.000000', '1.000000']);
    expect(numbers(scales.new.at(-1)?.transform)).toEqual([1, 1]);
  });

  it('holds the leaving view until the arriving one has drawn, then cross-fades', () => {
    const { instance, scales } = morphInstance();
    morphAtlasOnCompositor(instance, { from: ATLAS_ZOOM.mini, to: ATLAS_ZOOM.full });

    const early = scales.old.filter((frame) => Number(frame.offset) <= 0.3);
    expect(early.every((frame) => frame.opacity === 1)).toBe(true);
    expect([scales.old.at(-1)?.opacity, scales.new.at(-1)?.opacity]).toEqual([0, 1]);
    scales.old.forEach((frame, i) => {
      expect(Number(frame.opacity) + Number(scales.new[i].opacity)).toBeCloseTo(1);
    });
  });

  it("leaves the browser's morph to a rotated or scaled box", () => {
    const { instance, box, scales } = morphInstance('matrix(0, 1, -1, 0, 18.5, 88.5)');
    morphAtlasOnCompositor(instance, { from: ATLAS_ZOOM.mini, to: ATLAS_ZOOM.full });

    expect(box.keyframes[0].width).toBe('329px');
    expect(scales.old).toEqual([{ opacity: 1 }, { opacity: 0 }]);
  });
});
