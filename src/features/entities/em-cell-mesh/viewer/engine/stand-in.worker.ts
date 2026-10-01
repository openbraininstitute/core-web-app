/** Makes the stand-in with meshoptimizer; terminated after, which frees meshoptimizer's memory. */
import * as Comlink from 'comlink';

import { createStandInApi } from './worker-apis';

const memories: WebAssembly.Memory[] = [];

// meshoptimizer instantiates its modules' WASM as it loads, the simplifier's among them. The simplifier's memory never
// shrinks, so the largest after the simplification is its peak, for the Debug menu.
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
      const { MeshoptSimplifier } = await import('meshoptimizer');
      await MeshoptSimplifier.ready;
      return MeshoptSimplifier;
    },
    () => (memories.length ? Math.max(...memories.map((m) => m.buffer.byteLength)) : null)
  )
);
