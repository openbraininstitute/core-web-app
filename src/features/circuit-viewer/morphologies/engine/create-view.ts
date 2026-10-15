import { logError } from '@/utils/logger';

import { CircuitMorphologyViewer } from './circuit-morphology-viewer';
import { probeWebGPU } from './probe';

import type { CircuitMorphologyView } from '../types';

export type Tier = 'webgpu' | 'webgl';
/**
 * What the debug tools ask for: the tier the browser allows, WebGL 2 whatever it allows, or WebGPU while it does not
 * draw everything yet.
 */
export type TierChoice = 'auto' | 'webgl' | 'webgpu';

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
 * `onLost` is told, and every view made after draws with WebGL 2.
 */
export function createCircuitView(
  host: HTMLElement,
  choice: TierChoice,
  onLost: () => void
): CreatedView | Promise<CreatedView> {
  if (choice === 'webgl') return onWebGL(host, 'chosen in the debug tools');
  if (lost) return onWebGL(host, 'the graphics were reset');
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) return onWebGL(host, 'no WebGPU in this browser');
  return probeWebGPU(gpu).then(async (probed) => {
    if ('reason' in probed) return onWebGL(host, probed.reason);
    const { device } = probed;
    // Until the WebGPU engine draws everything, it is asked for in the debug tools alone.
    if (choice !== 'webgpu') {
      device.destroy();
      return onWebGL(host, 'the WebGPU engine is not complete yet');
    }
    try {
      const { CircuitMorphologyGPU } = await import('./webgpu/circuit-morphology-gpu');
      const view = await CircuitMorphologyGPU.create(host, device, () => {
        lost = true;
        onLost();
      });
      return { view, tier: 'webgpu', reason: null };
    } catch (e) {
      logError('Could not start the WebGPU circuit view', e);
      device.destroy();
      return onWebGL(host, 'WebGPU could not start');
    }
  });
}
