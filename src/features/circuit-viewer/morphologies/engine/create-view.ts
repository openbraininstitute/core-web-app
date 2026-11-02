import { logError } from '@/utils/logger';

import { CircuitMorphologyViewer } from './circuit-morphology-viewer';
import { probeWebGPU, Unfit } from './probe';

import type { CircuitMorphologyView } from '../types';

export type Tier = 'webgpu' | 'webgl';
/** What the debug tools ask for: WebGPU where the browser has it, or WebGL 2 whatever it has. */
export type TierChoice = 'auto' | 'webgl';
/** How a WebGPU view gave out: its device lost, or out of memory for a pack's arena. */
export type Lost = 'reset' | 'memory';
/** Why WebGL 2 draws a view WebGPU was asked for, where the page says so: the browser has none, or a view gave out. */
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

/** How a WebGPU view gave out, once one did: WebGL 2 for the rest of the page's life. */
let lost: Lost | null = null;

function onWebGL(
  host: HTMLElement,
  onLost: () => void,
  reason: string,
  fallback: Fallback | null = null
): CreatedView {
  return { view: new CircuitMorphologyViewer(host, onLost), tier: 'webgl', reason, fallback };
}

/**
 * A view of a circuit in `host`, drawn with WebGPU where the browser grants a device fit for it, else with WebGL 2: at
 * once where WebGPU is out of the question, once the device is asked for where it is not. Should the view give out, its
 * device lost or out of memory, `onLost` is told, and every view made after draws with WebGL 2; it is told too where
 * a WebGL 2 view's context is lost, the next made alike. Aborted (`signal`)
 * while the device is asked for, no view is made, and the promise rejects with the signal's reason.
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
  // Fetched while the device is asked for.
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
          lost = how;
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
