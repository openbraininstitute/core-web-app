/**
 * Makes the stand-in, clustered on Draco's grid or with meshoptimizer otherwise; terminated after, which frees
 * meshoptimizer's memory.
 */
import * as Comlink from 'comlink';

import { createStandInApi } from './worker-apis';

const memories: WebAssembly.Memory[] = [];

// The simplifier instantiates its WASM as it loads, for a mesh that takes it. Its memory never shrinks, so after the
// simplification it is at its peak, for the Debug menu.
const instantiate = WebAssembly.instantiate.bind(WebAssembly);
WebAssembly.instantiate = (async (...args: Parameters<typeof instantiate>) => {
  const result = await instantiate(...args);
  const instance = ('instance' in result ? result.instance : result) as WebAssembly.Instance;
  const exported = instance.exports.memory;
  if (exported instanceof WebAssembly.Memory) memories.push(exported);
  return result;
}) as typeof WebAssembly.instantiate;

Comlink.expose(
  createStandInApi(
    async () => {
      const { MeshoptSimplifier } = await import('meshoptimizer/simplifier');
      await MeshoptSimplifier.ready;
      return MeshoptSimplifier;
    },
    () => (memories.length ? Math.max(...memories.map((m) => m.buffer.byteLength)) : null)
  )
);
