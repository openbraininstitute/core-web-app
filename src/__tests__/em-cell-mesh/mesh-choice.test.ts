// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  type ChoiceInput,
  errorPixels,
  FrameCost,
  MeshChooser,
  MovingCost,
  SKIP_FRAMES,
} from '@/features/entities/em-cell-mesh/viewer/engine/mesh-choice';

const AUTO: ChoiceInput = {
  fullReady: true,
  whole: false,
  forced: 'auto',
  errorPx: 0.5,
  moving: false,
  slow: false,
};

describe('the error on screen', () => {
  it('is in device pixels: twice as many on a screen at twice the resolution', () => {
    expect(errorPixels(1.5, 1.5, 1)).toBe(1);
    expect(errorPixels(1.5, 1.5, 2)).toBe(2);
    expect(errorPixels(1.5, 0.75, 1)).toBe(2);
  });
});

describe('MeshChooser', () => {
  const run = (errors: number[], input: Partial<ChoiceInput> = {}) => {
    const chooser = new MeshChooser();
    return errors.map((errorPx) => chooser.choose({ ...AUTO, ...input, errorPx }).mesh);
  };

  it('brings the full mesh in past 0.1 px and takes it out under 0.06 px, not in between', () => {
    expect(run([0.03, 0.09, 0.11, 0.09, 0.07, 0.05, 0.07, 0.09, 0.11])).toEqual([
      'stand-in',
      'stand-in',
      'full',
      'full',
      'full',
      'stand-in',
      'stand-in',
      'stand-in',
      'full',
    ]);
  });

  it('draws the stand-in, with why, until the full mesh is up, and where it is whole', () => {
    const chooser = new MeshChooser();
    expect(chooser.choose({ ...AUTO, errorPx: 5, fullReady: false })).toEqual({
      mesh: 'stand-in',
      reason: 'loading',
    });
    expect(chooser.choose({ ...AUTO, errorPx: 5, whole: true, fullReady: false })).toEqual({
      mesh: 'stand-in',
      reason: 'whole',
    });
    expect(chooser.choose({ ...AUTO, errorPx: 5 })).toEqual({ mesh: 'full', reason: 'error' });
  });

  it('keeps the side of the threshold while something else chose the mesh', () => {
    const chooser = new MeshChooser();
    chooser.choose({ ...AUTO, errorPx: 5, fullReady: false });
    // Still past 0.06 px: the full mesh, as soon as it is there.
    expect(chooser.choose({ ...AUTO, errorPx: 0.08 }).mesh).toBe('full');
  });

  it('draws what the Debug menu forces, whatever the error', () => {
    expect(run([0.1], { forced: 'full' })).toEqual(['full']);
    expect(run([9], { forced: 'stand-in' })).toEqual(['stand-in']);
  });

  it('draws the stand-in while the view moves on a slow GPU, and the full mesh once it stops', () => {
    const chooser = new MeshChooser();
    const slow = { ...AUTO, errorPx: 5, slow: true };
    expect(chooser.choose({ ...slow, moving: true })).toEqual({
      mesh: 'stand-in',
      reason: 'moving',
    });
    expect(chooser.choose(slow).mesh).toBe('full');
    expect(chooser.choose({ ...AUTO, errorPx: 5, moving: true }).mesh).toBe('full');
  });
});

describe('FrameCost', () => {
  it('is the median of the last three full frames, and slow past the limit given', () => {
    const cost = new FrameCost();
    expect(cost.ms).toBeNull();
    expect(cost.slow(28)).toBe(false);
    for (const ms of [5, 40, 7]) cost.add(ms);
    expect(cost.ms).toBe(7);
    expect(cost.slow(28)).toBe(false);
    // The first two have gone: 7, 30, 35.
    for (const ms of [30, 35]) cost.add(ms);
    expect(cost.ms).toBe(30);
    expect(cost.slow(28)).toBe(true);
    expect(cost.slow(30)).toBe(false);
  });

  it('counts a cold frame, the first after a pause, after the stand-in or after a change, at half', () => {
    const cost = new FrameCost();
    cost.add(24);
    expect(cost.ms).toBe(12);
    expect(cost.slow(14)).toBe(false);
    cost.add(30, true);
    cost.add(30);
    expect(cost.ms).toBe(15);
    expect(cost.slow(14)).toBe(true);
    cost.reset();
    cost.add(20);
    expect(cost.ms).toBe(10);
  });

  it('skips the frames that pay for a change, and asks for no more than it takes to measure one', () => {
    const cost = new FrameCost();
    cost.add(60);
    cost.reset();
    expect(cost.ms).toBeNull();
    // Slow as it was, until a frame is measured after the change, against the limit as it is now.
    expect(cost.slow(28)).toBe(true);
    expect(cost.slow(40)).toBe(false);
    const measured: boolean[] = [];
    const asked: boolean[] = [];
    for (let i = 0; i < SKIP_FRAMES + 2; i++) {
      asked.push(cost.wantsFrame());
      measured.push(cost.measure());
    }
    expect(measured).toEqual([false, false, true, true]);
    // The frames skipped, and the one measured after them: no more.
    expect(asked).toEqual([true, true, false, false]);
    cost.add(10);
    expect(cost.wantsFrame()).toBe(false);
    expect(cost.slow(28)).toBe(false);
    cost.reset();
    expect(cost.slow(28)).toBe(false);
  });
});

describe('MovingCost', () => {
  it('turns slow on two moving frames of the full mesh in a row past its limit, not one, until the view stops', () => {
    const cost = new MovingCost();
    cost.add(29, 28);
    expect(cost.slow).toBe(false);
    cost.add(28, 28);
    cost.add(29, 28);
    expect(cost.slow).toBe(false);
    cost.add(29, 28);
    expect(cost.slow).toBe(true);
    cost.add(1, 28);
    expect(cost.slow).toBe(true);
    cost.stop();
    expect(cost.slow).toBe(false);
    cost.add(29, 28);
    expect(cost.slow).toBe(false);
  });
});
