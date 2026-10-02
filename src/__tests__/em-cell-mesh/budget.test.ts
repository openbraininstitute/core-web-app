// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  checkBudget,
  DRACO_MAX_TRIANGLES,
  deviceOf,
  loadPeakBytes,
} from '@/features/entities/em-cell-mesh/viewer/engine/budget';

import type { MeshHeader } from '@/features/entities/em-cell-mesh/viewer/engine/glb';

const header = (triangles: number, draco = true): MeshHeader => ({
  triangles,
  vertices: triangles / 2,
  draco,
  bounds: null,
});
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
const PHONE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36';
/** Safari on an iPad, which says it is a Mac. */
const IPAD =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15';
/** Fullscreen on a 1920 × 1080 screen at twice the CSS resolution. */
const PIXELS = 3840 * 2160;

describe('checkBudget', () => {
  it("refuses a Draco mesh past what Draco's 2 GiB can decode, whatever the device", () => {
    expect(DRACO_MAX_TRIANGLES).toBeGreaterThan(28e6);
    expect(DRACO_MAX_TRIANGLES).toBeLessThan(28.5e6);
    const device = { memoryGB: 32, pixels: PIXELS };
    expect(checkBudget(header(27.5e6), device).kind).toBe('ok');
    expect(checkBudget(header(29e6), device)).toEqual({ kind: 'too-large', triangles: 29e6 });
    // A plain GLB is not decoded by Draco.
    expect(checkBudget(header(29e6, false), device).kind).toBe('ok');
  });

  it('lets the largest mesh load on 8 GB, not on 4, the framebuffers counted', () => {
    expect(checkBudget(header(27.5e6), { memoryGB: 8, pixels: PIXELS }).kind).toBe('ok');
    const four = checkBudget(header(27.5e6), { memoryGB: 4, pixels: PIXELS });
    expect(four.kind).toBe('over-budget');
    // A median mesh fits a 2 GB phone, its screen 412 × 915 CSS pixels at twice the resolution.
    expect(checkBudget(header(5e6), { memoryGB: 2, pixels: 824 * 1830 }).kind).toBe('ok');
    const small = checkBudget(header(1e6), { memoryGB: 8, pixels: 0 });
    const large = checkBudget(header(1e6), { memoryGB: 8, pixels: PIXELS });
    if (small.kind !== 'ok' || large.kind !== 'ok') throw new Error('over budget');
    expect(large.peakBytes - small.peakBytes).toBe(80 * PIXELS);
  });

  it("takes in the decode Draco's memory as measured, a growth step over at most", () => {
    const MiB = 2 ** 20;
    // Measured in Node: the whole decode step, Draco's memory and the arrays it hands over.
    const largest = { triangles: 27_459_402, vertices: 13_756_163, draco: true, bounds: null };
    const median = { triangles: 8_735_131, vertices: 4_445_069, draco: true, bounds: null };
    for (const [mesh, measured] of [
      [largest, 2_275 * MiB],
      [median, 794 * MiB],
    ] as const) {
      expect(loadPeakBytes(mesh)).toBeGreaterThan(measured);
      expect(loadPeakBytes(mesh)).toBeLessThan(measured * 1.15);
    }
  });

  it('counts the vertices, which a plain GLB without shared vertices has three of a triangle', () => {
    const shared = { triangles: 1e6, vertices: 0.5e6, draco: false, bounds: null };
    const unshared = { ...shared, vertices: 3e6 };
    expect(loadPeakBytes(unshared)).toBeGreaterThan(2 * loadPeakBytes(shared));
  });
});

describe('deviceOf', () => {
  it("takes the browser's memory where it says, and assumes 8 GB on a desktop, 4 on a phone, where it doesn't", () => {
    expect(deviceOf({ userAgent: DESKTOP, deviceMemory: 16 }, 1).memoryGB).toBe(16);
    expect(deviceOf({ userAgent: DESKTOP }, 1).memoryGB).toBe(8);
    expect(deviceOf({ userAgent: PHONE }, 1).memoryGB).toBe(4);
    expect(deviceOf({ userAgent: DESKTOP, userAgentData: { mobile: true } }, 1).memoryGB).toBe(4);
  });

  it('takes an iPad, which says it is a Mac, for a tablet by its touch points', () => {
    expect(deviceOf({ userAgent: IPAD, maxTouchPoints: 5 }, 1).memoryGB).toBe(4);
    expect(deviceOf({ userAgent: IPAD, maxTouchPoints: 0 }, 1).memoryGB).toBe(8);
  });
});
