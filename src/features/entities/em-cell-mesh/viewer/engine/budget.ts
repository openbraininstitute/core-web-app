/**
 * Whether a mesh fits in the browser, judged from its GLB's header before anything is decoded.
 *
 * The bytes per triangle and per vertex were measured on the median and the largest staging meshes, in Node. The share
 * of the device's memory to allow is a placeholder until the measurement on an 8 GB Windows laptop.
 */
import type { MeshHeader } from './glb';

/** Draco's WASM memory can't grow past 2 GiB, and peaks at 73–76 bytes a triangle. */
export const DRACO_MAX_TRIANGLES = Math.floor(2 ** 31 / 76);
/** The composer's 4× multisampled target and its depth, their resolves, the second target and the canvas. */
export const FRAMEBUFFER_BYTES_PER_PIXEL = 80;
/** The share of the device's memory a mesh may take at its peak. */
const MEMORY_SHARE = 0.5;
/** What to assume where the browser doesn't say (Firefox, Safari), GB. */
const ASSUMED_MEMORY_GB = { desktop: 8, mobile: 4 };

/**
 * Each step's memory, bytes a triangle and a vertex, one worker at a time:
 * - decoding: Draco's memory, which never shrinks, and the indices and positions it hands over;
 * - the stand-in: those, the positions as floats, and meshoptimizer's memory;
 * - the full build: those, the normals, the split's order and keys, and the chunks;
 * - uploading: the chunks, on the page and on the GPU.
 */
const STEPS = {
  decode: { triangle: 12, vertex: 12 },
  standIn: { triangle: 36, vertex: 61 },
  build: { triangle: 26, vertex: 42 },
  upload: { triangle: 12, vertex: 24 },
};
/** Draco's memory a triangle, plus at most one step of its growth: Emscripten grows it by a fifth, by 96 MiB at most. */
const DRACO = { triangle: 72, growth: 96 * 2 ** 20 };

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

type DeviceNavigator = Pick<Navigator, 'userAgent'> & {
  deviceMemory?: number;
  maxTouchPoints?: number;
  userAgentData?: { mobile?: boolean };
};

/** A phone or a tablet: an iPad says it is a Mac, and gives itself away by its touch points. */
function isMobile(nav: DeviceNavigator): boolean {
  if (nav.userAgentData?.mobile !== undefined) return nav.userAgentData.mobile;
  if (/Mobi|Android|iPad|iPhone/i.test(nav.userAgent)) return true;
  return /Macintosh/.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1;
}

export function deviceOf(nav: DeviceNavigator, pixels: number): Device {
  const memoryGB = nav.deviceMemory ?? ASSUMED_MEMORY_GB[isMobile(nav) ? 'mobile' : 'desktop'];
  return { memoryGB, pixels };
}

/** The most the load takes at any one time, the framebuffers aside. */
export function loadPeakBytes({ triangles, vertices, draco }: MeshHeader): number {
  const step = (s: { triangle: number; vertex: number }) =>
    s.triangle * triangles + s.vertex * vertices;
  const decode = step(STEPS.decode) + (draco ? DRACO.triangle * triangles + DRACO.growth : 0);
  return Math.max(decode, step(STEPS.standIn), step(STEPS.build), step(STEPS.upload));
}

export function checkBudget(header: MeshHeader, device: Device): Budget {
  if (header.draco && header.triangles > DRACO_MAX_TRIANGLES) {
    return { kind: 'too-large', triangles: header.triangles };
  }
  const peakBytes = loadPeakBytes(header) + device.pixels * FRAMEBUFFER_BYTES_PER_PIXEL;
  const allowedBytes = device.memoryGB * 2 ** 30 * MEMORY_SHARE;
  return { kind: peakBytes <= allowedBytes ? 'ok' : 'over-budget', peakBytes, allowedBytes };
}
