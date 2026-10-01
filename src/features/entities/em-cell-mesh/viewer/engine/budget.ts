/**
 * Whether a mesh fits in the browser, judged from its GLB's header before anything is decoded.
 *
 * The figures come from the performance review's Node measurements on a synthetic mesh. The share of the device's
 * memory to allow is a placeholder until the measurement on an 8 GB Windows laptop.
 */
import type { MeshHeader } from './glb';

/** Draco's WASM memory can't grow past 2 GiB, and peaks at 73–76 bytes a triangle. */
export const DRACO_MAX_TRIANGLES = Math.floor(2 ** 31 / 76);
/** The peak while loading: Draco's memory, plus the arrays it hands over. */
export const PEAK_BYTES_PER_TRIANGLE = 95;
/** On the GPU once loaded: 12-byte vertices, about half as many as triangles, border copies included, and 16-bit indices. */
export const GPU_BYTES_PER_TRIANGLE = 12.2;
/** The composer's 4× multisampled target and its depth, their resolves, the second target and the canvas. */
export const FRAMEBUFFER_BYTES_PER_PIXEL = 80;
/** The share of the device's memory a mesh may take at its peak. */
export const MEMORY_SHARE = 0.5;
/** What to assume where the browser doesn't say (Firefox, Safari), GB. */
export const ASSUMED_MEMORY_GB = { desktop: 8, mobile: 4 };

export interface Device {
  /** GB, as `navigator.deviceMemory` reports it, or as assumed. */
  memoryGB: number;
  /** The canvas's device pixels, fullscreen. */
  pixels: number;
}

export type Budget =
  | { kind: 'ok'; peakBytes: number; allowedBytes: number }
  /** Draco can't decode it in the browser at all. */
  | { kind: 'too-large'; triangles: number }
  /** It may not fit this device; the user may load it anyway. */
  | { kind: 'over-budget'; peakBytes: number; allowedBytes: number };

export function deviceOf(
  nav: Pick<Navigator, 'userAgent'> & {
    deviceMemory?: number;
    userAgentData?: { mobile?: boolean };
  },
  pixels: number
): Device {
  const mobile = nav.userAgentData?.mobile ?? /Mobi|Android/i.test(nav.userAgent);
  const memoryGB = nav.deviceMemory ?? ASSUMED_MEMORY_GB[mobile ? 'mobile' : 'desktop'];
  return { memoryGB, pixels };
}

export function checkBudget(header: MeshHeader, device: Device): Budget {
  if (header.draco && header.triangles > DRACO_MAX_TRIANGLES) {
    return { kind: 'too-large', triangles: header.triangles };
  }
  const peakBytes =
    header.triangles * (PEAK_BYTES_PER_TRIANGLE + GPU_BYTES_PER_TRIANGLE) +
    device.pixels * FRAMEBUFFER_BYTES_PER_PIXEL;
  const allowedBytes = device.memoryGB * 2 ** 30 * MEMORY_SHARE;
  return { kind: peakBytes <= allowedBytes ? 'ok' : 'over-budget', peakBytes, allowedBytes };
}
