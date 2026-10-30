import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type MorphologiesSource,
  useCircuitMorphologies,
} from '@/features/circuit-viewer/morphologies/use-circuit-morphologies';

import { loadedData, loadedOf, loads, started } from './pending-loads';

const h = vi.hoisted(() => ({
  packRequest: vi.fn(async ({ circuitId }: { circuitId: string }) => ({
    url: `https://bluenaas.test/circuit/${circuitId}/morphology-pack`,
    headers: { Authorization: 'Bearer token' },
  })),
  logError: vi.fn(),
}));

vi.mock('@/features/circuit-viewer/morphologies/load/load', () => import('./pending-loads'));

vi.mock('@/api/small-scale-simulator/circuit/morphology-pack', () => ({
  buildMorphologyPackDownloadRequest: h.packRequest,
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
  pack: { size: 1234, sha256: 'ab12' },
};

let queryClient = new QueryClient();
const withQueries = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

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
    { initialProps: { source }, wrapper: withQueries }
  );
  return { ...hook, onStopped, renders };
}

const ready = (result: { current: ReturnType<typeof useCircuitMorphologies> }) =>
  waitFor(() => expect(result.current.load.status).toBe('ready'));

afterEach(() => {
  queryClient = new QueryClient();
  loads.length = 0;
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

  it("asks Bluenaas for the circuit's pack, in the route's workspace, with its size and digest", async () => {
    const { result } = render();
    expect(result.current.load).toEqual({ status: 'loading', received: 0, total: 1234 });

    const load = await started();
    expect(h.packRequest).toHaveBeenCalledWith({
      ctx: { virtualLabId: 'lab', projectId: 'project' },
      circuitId: 'circuit-id',
    });
    expect(load.options.request).toEqual({
      url: 'https://bluenaas.test/circuit/circuit-id/morphology-pack',
      headers: { Authorization: 'Bearer token' },
      pack: { size: 1234, sha256: 'ab12' },
    });
    expect(load.options.populations).toBe(SOURCE.populations);
  });

  it("says how much of the pack has come in, then hands over the morphologies with the page's somas filled in", async () => {
    const { result, onStopped } = render();
    const load = await started();

    act(() => load.options.onProgress?.(1e6, 4e6));
    expect(result.current.load).toEqual({ status: 'loading', received: 1e6, total: 4e6 });

    const loaded = data();
    await act(async () => load.resolve(loadedOf(loaded)));
    await ready(result);
    expect(result.current.load).toEqual({ status: 'ready', data: loaded });
    expect([...loaded.somas]).toEqual([0, 0, 0, 5, 30, 0, 0, 4]);
    expect(loaded.bounds.max).toEqual([34, 5, 5]);
    expect(result.current.stopped).toBeNull();
    expect(onStopped).not.toHaveBeenCalled();
  });

  it('says how much of the rest of the pack has come in once the morphologies are shown, until it all has', async () => {
    const { result } = render();
    const load = await started();
    const loaded = data();
    await act(async () => load.resolve(loadedOf(loaded, false, new Promise(() => {}))));
    await ready(result);

    act(() => load.options.onProgress?.(3e6, 4e6));
    expect(result.current.load).toEqual({
      status: 'ready',
      data: loaded,
      coming: { received: 3e6, total: 4e6 },
    });
    act(() => load.options.onProgress?.(4e6, 4e6));
    expect(result.current.load).toEqual({ status: 'ready', data: loaded });
  });

  it('says the rest is coming from the moment the morphologies are shown, before any report says how much has come', async () => {
    const { result } = render();
    const load = await started();
    const loaded = data();
    await act(async () => load.resolve(loadedOf(loaded, false, new Promise(() => {}))));

    expect(result.current.load).toEqual({
      status: 'ready',
      data: loaded,
      coming: { received: 0, total: 1234 },
    });
    act(() => load.options.onProgress?.(1e6, 4e6));
    expect(result.current.load).toEqual({
      status: 'ready',
      data: loaded,
      coming: { received: 1e6, total: 4e6 },
    });
  });

  it('keeps the morphologies shown where the rest of the pack does not come in, and says so', async () => {
    const { result, onStopped } = render();
    const load = await started();
    const loaded = data();
    const error = new Error('Download not resumed (HTTP 403)');
    await act(async () => load.resolve(loadedOf(loaded, false, Promise.reject(error))));
    await ready(result);

    await waitFor(() => expect(result.current.stopped).toBe('cut'));
    expect(h.logError).toHaveBeenCalledWith(
      'Could not load the whole of the circuit morphologies',
      error
    );
    expect(result.current.load).toEqual({ status: 'ready', data: loaded });
    expect(onStopped).not.toHaveBeenCalled();
  });

  it('loads a pack cut short again when asked, letting go of the one before', async () => {
    const { result } = render();
    const first = await started();
    await act(async () => first.resolve(loadedOf(data(), false, Promise.reject(new Error('cut')))));
    await waitFor(() => expect(result.current.stopped).toBe('cut'));

    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await act(async () => result.current.retry());

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['circuit-morphology-pack', 'circuit-id'],
    });
    expect(first.options.signal.aborted).toBe(true);
    expect(result.current.stopped).toBeNull();
    expect(result.current.load).toEqual({ status: 'loading', received: 0, total: 1234 });
    const second = await started(2);
    expect(second.options.request).toEqual(first.options.request);
  });

  it('says the pack changed where what came in is not the one Bluenaas named', async () => {
    const { result } = render();
    const load = await started();
    const changed = Object.assign(new Error('digest'), { name: 'PackChanged' });
    await act(async () => load.resolve(loadedOf(data(), false, Promise.reject(changed))));

    await waitFor(() => expect(result.current.stopped).toBe('changed'));
  });

  it('makes the headers again for a download resumed', async () => {
    render();
    const load = await started();
    h.packRequest.mockResolvedValueOnce({
      url: 'https://bluenaas.test/circuit/circuit-id/morphology-pack',
      headers: { Authorization: 'Bearer newer' },
    });

    await expect(load.options.freshHeaders?.()).resolves.toEqual({ Authorization: 'Bearer newer' });
  });

  it('forgets a pack cut short once its source goes', async () => {
    const { result, rerender } = render();
    const load = await started();
    await act(async () => load.resolve(loadedOf(data(), false, Promise.reject(new Error('cut')))));
    await waitFor(() => expect(result.current.stopped).toBe('cut'));

    rerender({ source: null });

    expect(result.current.stopped).toBeNull();
  });

  it('says nothing of a pack cut short after its load was stopped', async () => {
    let cut = (_: Error) => {};
    const whole = new Promise<void>((_, reject) => {
      cut = reject;
    });
    const { result, rerender } = render();
    const load = await started();
    await act(async () => load.resolve(loadedOf(data(), false, whole)));
    await ready(result);
    rerender({ source: null });

    await act(async () => cut(new Error('aborted')));

    expect(result.current.stopped).toBeNull();
    expect(h.logError).not.toHaveBeenCalled();
  });

  it('ends idle and says so when the load fails, until that is dismissed', async () => {
    const { result, onStopped } = render();
    const load = await started();
    const error = new Error('Download failed (HTTP 500)');

    await act(async () => load.reject(error));

    expect(result.current.load).toEqual({ status: 'idle' });
    expect(result.current.stopped).toBe('failed');
    expect(onStopped).toHaveBeenCalledTimes(1);
    expect(h.logError).toHaveBeenCalledWith('Could not load the circuit morphologies', error);

    act(() => result.current.dismiss());
    expect(result.current.stopped).toBeNull();
  });

  it('keeps why the last load stopped while its source is gone, and forgets it when the next starts', async () => {
    const { result, rerender } = render();
    const first = await started();
    await act(async () => first.reject(new Error('Download failed (HTTP 500)')));

    rerender({ source: null });
    expect(result.current.stopped).toBe('failed');

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
    await act(async () => first.resolve(loadedOf(data())));
    expect(result.current.load).toEqual({ status: 'idle' });

    rerender({ source: SOURCE });
    const second = await started(2);
    await act(async () => second.resolve(loadedOf(data(), true)));
    await ready(result);
    rerender({ source: null });
    expect(result.current.load).toEqual({ status: 'idle' });
    expect(onStopped).not.toHaveBeenCalled();
  });

  it('never hands a source the morphologies of the one before it', async () => {
    const { result, rerender, renders } = render();
    const first = await started();
    await act(async () => first.resolve(loadedOf(data())));
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
    renderHook(() => useCircuitMorphologies(SOURCE, () => {}), {
      wrapper: ({ children }) => <StrictMode>{withQueries({ children })}</StrictMode>,
    });

    await started();
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    expect(loads).toHaveLength(1);
    expect(h.packRequest).toHaveBeenCalledTimes(1);
  });
});
