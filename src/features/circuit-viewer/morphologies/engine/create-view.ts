import { logError } from '@/utils/logger';

import { CircuitMorphologyViewer } from './circuit-morphology-viewer';
import { probeWebGPU } from './probe';

import type { CircuitMorphologyView } from '../types';

export type Tier = 'webgpu' | 'webgl';
/** What the debug tools ask for: WebGPU where the browser has it, or WebGL 2 whatever it has. */
export type TierChoice = 'auto' | 'webgl';

export interface CreatedView {
  view: CircuitMorphologyView;
  tier: Tier;
  /** Why the view is not drawn with WebGPU; null where it is. */
  reason: string | null;
}

/** The graphics were reset once: WebGL 2 for the rest of the page's life. */
let lost = false;

function onWebGL(host: HTMLElement, reason: string): CreatedView {
  return { view: new CircuitMorphologyViewer(host), tier: 'webgl', reason };
}

/**
 * A view of a circuit in `host`, drawn with WebGPU where the browser grants a device fit for it, else with WebGL 2: at
 * once where WebGPU is out of the question, once the device is asked for where it is not. Should the device be lost,
 * `onLost` is told, and every view made after draws with WebGL 2. Aborted (`signal`) while the device is asked for, no
 * view is made, and the promise rejects with the signal's reason.
 */
export function createCircuitView(
  host: HTMLElement,
  choice: TierChoice,
  onLost: () => void,
  signal?: AbortSignal
): CreatedView | Promise<CreatedView> {
  if (choice === 'webgl') return onWebGL(host, 'chosen in the debug tools');
  if (lost) return onWebGL(host, 'the graphics were reset');
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) return onWebGL(host, 'no WebGPU in this browser');
  // Fetched while the device is asked for.
  const engine = import('./webgpu/circuit-morphology-gpu');
  engine.catch(() => {});
  return probeWebGPU(gpu).then(async (probed) => {
    if (signal?.aborted) {
      if ('device' in probed) probed.device.destroy();
      throw signal.reason;
    }
    if ('reason' in probed) return onWebGL(host, probed.reason);
    const { device } = probed;
    try {
      const { CircuitMorphologyGPU } = await engine;
      const view = await CircuitMorphologyGPU.create(
        host,
        device,
        () => {
          lost = true;
          onLost();
        },
        signal
      );
      return { view, tier: 'webgpu', reason: null };
    } catch (e) {
      device.destroy();
      if (signal?.aborted) throw signal.reason;
      logError('Could not start the WebGPU circuit view', e);
      return onWebGL(host, 'WebGPU could not start');
    }
  });
}
