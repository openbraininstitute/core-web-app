import { logError } from '@/utils/logger';

import { CircuitMorphologyViewer } from './circuit-morphology-viewer';
import { probeWebGPU, Unfit } from './probe';

import type { CircuitMorphologyView } from '../types';

export type Tier = 'webgpu' | 'webgl';
/** What the debug tools ask for: WebGPU where the browser has it, or WebGL 2 whatever it has. */
export type TierChoice = 'auto' | 'webgl';
/** How a WebGPU view failed: its device was lost, or it ran out of memory for a pack's arena. */
export type Lost = 'reset' | 'memory';
/** Why WebGL 2 draws a view WebGPU was asked for, where the page says why: the browser has none, or a view failed. */
export type Fallback = 'missing' | Lost;

export interface CreatedView {
  view: CircuitMorphologyView;
  tier: Tier;
  /** Why the view is not drawn with WebGPU; null where it is. */
  reason: string | null;
  fallback: Fallback | null;
}

const REASONS: Record<Fallback, string> = {
  missing: 'no WebGPU in this browser',
  reset: 'the graphics were reset',
  memory: 'the graphics ran out of memory',
};

/**
 * How a WebGPU view failed for good. Once it is set, views use WebGL 2 for the rest of the page's life. The first reset
 * does not count, as the browser often hands out a new device after one; running out of memory does.
 */
let lost: Lost | null = null;
let resets = 0;

function onWebGL(
  host: HTMLElement,
  onLost: () => void,
  reason: string,
  fallback: Fallback | null = null
): CreatedView {
  return { view: new CircuitMorphologyViewer(host, onLost), tier: 'webgl', reason, fallback };
}

/**
 * Makes a view of a circuit in `host`. It draws with WebGPU where the browser grants a device fit for it, else with
 * WebGL 2. The view comes at once where WebGPU is out of the question; otherwise it comes once the device has been
 * asked for. If a WebGPU view fails (its device lost, or out of memory), `onLost` is called, and views made after a
 * second reset, or after the first time memory runs out, draw with WebGL 2. `onLost` is also called when a WebGL 2
 * view loses its context, and the next view is made by the same rules. If `signal` aborts while the device is asked
 * for, no view is made, and the promise rejects with the signal's reason.
 */
export function createCircuitView(
  host: HTMLElement,
  choice: TierChoice,
  onLost: () => void,
  signal?: AbortSignal
): CreatedView | Promise<CreatedView> {
  if (choice === 'webgl') return onWebGL(host, onLost, 'chosen in the debug tools');
  if (lost) return onWebGL(host, onLost, REASONS[lost], lost);
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) return onWebGL(host, onLost, REASONS.missing, 'missing');
  // Load the WebGPU engine while the device is asked for.
  const engine = import('./webgpu/circuit-morphology-gpu');
  engine.catch(() => {});
  return probeWebGPU(gpu).then(async (probed) => {
    if (signal?.aborted) {
      if ('device' in probed) probed.device.destroy();
      throw signal.reason;
    }
    if ('reason' in probed) return onWebGL(host, onLost, probed.reason);
    const { device } = probed;
    try {
      const { CircuitMorphologyGPU } = await engine;
      const view = await CircuitMorphologyGPU.create(
        host,
        device,
        (how) => {
          if (how === 'memory' || ++resets > 1) lost = how;
          onLost();
        },
        signal
      );
      return { view, tier: 'webgpu', reason: null, fallback: null };
    } catch (e) {
      device.destroy();
      if (signal?.aborted) throw signal.reason;
      logError('Could not start the WebGPU circuit view', e);
      return onWebGL(host, onLost, e instanceof Unfit ? e.message : 'WebGPU could not start');
    }
  });
}
