import { afterEach, expect, it, vi } from 'vitest';

import { loadActivity, loadBodies, loadSkeleton } from './walkthrough-data';

afterEach(() => vi.unstubAllGlobals());

it('does not parse HTTP error responses as activity data', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json }));
  await expect(loadActivity('/activity')).rejects.toThrow('503');
  expect(json).not.toHaveBeenCalled();
});

it('validates activity data before creating typed arrays', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cells: [] }) })
  );
  await expect(loadActivity('/activity')).rejects.toThrow('Invalid activity data');
});

it('preserves spike data and forwards request cancellation', async () => {
  const signal = new AbortController().signal;
  const fetcher = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ cells: [3, 7], times: [5, 10], ms: 20 }) });
  vi.stubGlobal('fetch', fetcher);
  const activity = await loadActivity('/activity', signal);
  expect(fetcher).toHaveBeenCalledWith('/activity', { signal });
  expect(Array.from(activity.cellIndices)).toEqual([3, 7]);
  expect(Array.from(activity.times)).toEqual([5, 10]);
  expect(activity.timeMaxInMs).toBe(20);
});

it('reads body ids without changing their values', async () => {
  const ids = new Uint32Array([100, 200]);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => ids.buffer })
  );
  expect(Array.from(await loadBodies('/bodies'))).toEqual([100, 200]);
});

it('rejects unavailable neuron skeletons', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
  await expect(loadSkeleton(42)).rejects.toThrow('404');
});
