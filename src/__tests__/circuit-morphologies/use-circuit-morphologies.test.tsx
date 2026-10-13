import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_SEGMENTS,
  type MorphologiesSource,
  useCircuitMorphologies,
} from '@/features/circuit-viewer/morphologies/use-circuit-morphologies';

import { loadedData, loads, started } from './pending-loads';

const h = vi.hoisted(() => ({
  request: vi.fn(async (circuitId: string, _maxSegments: number, _ctx: unknown) => ({
    url: `https://obi-one.test/circuit/viz/${circuitId}/morphology-pack`,
    headers: { Authorization: 'Bearer token' },
  })),
  logError: vi.fn(),
  View: () => null,
  viewFails: false,
}));

vi.mock('@/features/circuit-viewer/morphologies/load/load', () => import('./pending-loads'));

vi.mock('@/features/circuit-viewer/morphologies/circuit-morphologies', () => ({
  get CircuitMorphologies() {
    if (h.viewFails) throw new Error('Loading chunk failed');
    return h.View;
  },
}));

vi.mock('@/api/one/circuit-visualization', () => ({
  buildCircuitMorphologyPackRequest: h.request,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));

vi.mock('@/utils/logger', () => ({ logError: h.logError }));

const POPULATIONS = [
  { name: 'cortex', cells: 1 },
  { name: 'inputs', cells: 1 },
];

/** Two cells, the second of a population the pack has none of. */
const data = () => loadedData(POPULATIONS, [0, 0, 0, 5, NaN, NaN, NaN, 0], [100, 200, 300]);

const SOURCE: MorphologiesSource = {
  circuitId: 'circuit-id',
  populations: POPULATIONS,
  positions: Float32Array.of(100, 200, 300, 130, 200, 300),
  somaRadius: 4,
};

function render(source: MorphologiesSource | null = SOURCE) {
  const onStopped = vi.fn();
  /** The source and the load's status of every render. */
  const renders: [MorphologiesSource | null, string][] = [];
  const hook = renderHook(
    ({ source: of }: { source: MorphologiesSource | null }) => {
      const morphologies = useCircuitMorphologies(of, onStopped);
      renders.push([of, morphologies.load.status]);
      return morphologies;
    },
    { initialProps: { source } }
  );
  return { ...hook, onStopped, renders };
}

const ready = (result: { current: ReturnType<typeof useCircuitMorphologies> }) =>
  waitFor(() => expect(result.current.load.status).toBe('ready'));

afterEach(() => {
  loads.length = 0;
  h.viewFails = false;
  vi.clearAllMocks();
});

describe('useCircuitMorphologies', () => {
  it('loads nothing without a source', async () => {
    const { result } = render(null);
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    expect(result.current.load).toEqual({ status: 'idle' });
    expect(result.current.stopped).toBeNull();
    expect(loads).toHaveLength(0);
  });

  it("asks OBI-One for the circuit's pack within the tier's budget, in the route's workspace", async () => {
    const { result } = render();
    expect(result.current.load).toEqual({ status: 'loading', received: 0, total: 0 });

    const load = await started();
    expect(h.request).toHaveBeenCalledWith('circuit-id', MAX_SEGMENTS, {
      virtualLabId: 'lab',
      projectId: 'project',
    });
    expect(load.options.request).toBe(await h.request.mock.results[0].value);
    expect(load.options.populations).toBe(SOURCE.populations);
  });

  it("says how much of the pack has come in, then hands over the morphologies with the page's somas filled in", async () => {
    const { result, onStopped } = render();
    const load = await started();

    act(() => load.options.onProgress?.(1e6, 4e6));
    expect(result.current.load).toEqual({ status: 'loading', received: 1e6, total: 4e6 });

    const loaded = data();
    await act(async () => load.resolve({ kind: 'loaded', data: loaded, fromCache: false }));
    await ready(result);
    expect(result.current.load).toEqual({ status: 'ready', data: loaded, View: h.View });
    expect([...loaded.somas]).toEqual([0, 0, 0, 5, 30, 0, 0, 4]);
    expect(loaded.bounds.max).toEqual([34, 5, 5]);
    expect(result.current.stopped).toBeNull();
    expect(onStopped).not.toHaveBeenCalled();
  });

  it('ends idle and says why, until that is dismissed, when OBI-One refuses the circuit', async () => {
    const { result, onStopped } = render();
    const load = await started();
    const refusal = { kind: 'refused', reason: 'too_many_neurons', detail: 'Over 5000' } as const;

    await act(async () => load.resolve(refusal));

    expect(result.current.load).toEqual({ status: 'idle' });
    expect(result.current.stopped).toBe(refusal);
    expect(onStopped).toHaveBeenCalledTimes(1);

    act(() => result.current.dismiss());
    expect(result.current.stopped).toBeNull();
  });

  it('ends idle and says so when the load fails', async () => {
    const { result, onStopped } = render();
    const load = await started();
    const error = new Error('Download failed (HTTP 500)');

    await act(async () => load.reject(error));

    expect(result.current.load).toEqual({ status: 'idle' });
    expect(result.current.stopped).toEqual({ kind: 'failed' });
    expect(onStopped).toHaveBeenCalledTimes(1);
    expect(h.logError).toHaveBeenCalledWith('Could not load the circuit morphologies', error);
  });

  it('fails where the view that draws the morphologies cannot be fetched', async () => {
    h.viewFails = true;
    const { result, onStopped } = render();
    const load = await started();

    await act(async () => load.resolve({ kind: 'loaded', data: data(), fromCache: false }));

    await waitFor(() => expect(result.current.stopped).toEqual({ kind: 'failed' }));
    expect(result.current.load).toEqual({ status: 'idle' });
    expect(onStopped).toHaveBeenCalledTimes(1);
  });

  it('keeps why the last load stopped while its source is gone, and forgets it when the next starts', async () => {
    const { result, rerender } = render();
    const first = await started();
    await act(async () => first.resolve({ kind: 'refused', reason: 'busy', detail: '' }));

    rerender({ source: null });
    expect(result.current.stopped).toMatchObject({ reason: 'busy' });

    rerender({ source: SOURCE });
    expect(result.current.stopped).toBeNull();
    expect(result.current.load.status).toBe('loading');
  });

  it('stops the load and lets go of the morphologies when the source goes', async () => {
    const { result, rerender, onStopped } = render();
    const first = await started();
    rerender({ source: null });

    expect(first.options.signal.aborted).toBe(true);
    expect(result.current.load).toEqual({ status: 'idle' });

    // What a stopped load still answers is not taken.
    await act(async () => first.resolve({ kind: 'loaded', data: data(), fromCache: false }));
    expect(result.current.load).toEqual({ status: 'idle' });

    rerender({ source: SOURCE });
    const second = await started(2);
    await act(async () => second.resolve({ kind: 'loaded', data: data(), fromCache: true }));
    await ready(result);
    rerender({ source: null });
    expect(result.current.load).toEqual({ status: 'idle' });
    expect(onStopped).not.toHaveBeenCalled();
  });

  it('never hands a source the morphologies of the one before it', async () => {
    const { result, rerender, renders } = render();
    const first = await started();
    await act(async () => first.resolve({ kind: 'loaded', data: data(), fromCache: false }));
    await ready(result);

    const next = { ...SOURCE, circuitId: 'another' };
    rerender({ source: next });

    expect(renders.filter(([source]) => source === next).map(([, status]) => status)).not.toContain(
      'ready'
    );
    expect(result.current.load.status).toBe('loading');
  });

  it('tells nobody of a load that fails once it was stopped', async () => {
    const { result, rerender, onStopped } = render();
    const load = await started();
    rerender({ source: null });

    await act(async () => load.reject(new Error('aborted')));

    expect(result.current.stopped).toBeNull();
    expect(onStopped).not.toHaveBeenCalled();
    expect(h.logError).not.toHaveBeenCalled();
  });

  it('starts one load where React runs the effect twice, as it does in development', async () => {
    renderHook(() => useCircuitMorphologies(SOURCE, () => {}), { wrapper: StrictMode });

    await started();
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    expect(loads).toHaveLength(1);
    expect(h.request).toHaveBeenCalledTimes(1);
  });
});
