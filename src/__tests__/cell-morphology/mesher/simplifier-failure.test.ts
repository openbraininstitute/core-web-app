// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { createMesherApi } from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher-api';

import { BRANCHED, params } from './mesh-utils';

vi.mock('meshoptimizer/simplifier', () => {
  const ready = Promise.reject(new Error('WASM failed'));
  // Handled, as the module that awaits it may load a task later.
  ready.catch(() => undefined);
  return { MeshoptSimplifier: { ready } };
});

describe('a worker whose simplifier failed to load', () => {
  it('still loads the skeleton, and fails only the meshing', async () => {
    const api = createMesherApi();
    const { summary, skeleton } = await api.load(BRANCHED);
    expect(summary.nodeCount).toBe(8);
    expect(skeleton.count).toBeGreaterThan(0);
    const plan = await api.hybridPlan(params(), { maxBatches: 1 });
    await expect(api.hybridBatch(plan.batches[0])).rejects.toThrow('WASM failed');
  });
});
