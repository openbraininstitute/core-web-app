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

function onWebGL(host: HTMLElement, reason: string): CreatedView {
  return { view: new CircuitMorphologyViewer(host), tier: 'webgl', reason };
}

/**
 * A view of a circuit in `host`, drawn with WebGPU where the browser grants a device fit for it, else with WebGL 2: at
 * once where WebGPU is out of the question, once the device is asked for where it is not.
 */
export function createCircuitView(
  host: HTMLElement,
  choice: TierChoice
): CreatedView | Promise<CreatedView> {
  if (choice === 'webgl') return onWebGL(host, 'chosen in the debug tools');
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) return onWebGL(host, 'no WebGPU in this browser');
  return probeWebGPU(gpu).then((probed) => {
    if ('reason' in probed) return onWebGL(host, probed.reason);
    // Until the WebGPU engine draws, the device is let go of.
    probed.device.destroy();
    return onWebGL(host, 'the WebGPU engine is not built yet');
  });
}
