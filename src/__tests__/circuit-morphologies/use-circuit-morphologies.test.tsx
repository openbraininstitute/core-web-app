import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AssetLabel, AssetStatus, type IAsset } from '@/api/entitycore/types/shared/global';
import {
  type MorphologiesSource,
  storedPackOf,
  useCircuitMorphologies,
} from '@/features/circuit-viewer/morphologies/use-circuit-morphologies';

import { loadedData, loadedOf, loads, started } from './pending-loads';

const h = vi.hoisted(() => ({
  request: vi.fn(async (circuitId: string, _ctx: unknown) => ({
    url: `https://obi-one.test/circuit/viz/${circuitId}/morphology-pack`,
    headers: { Authorization: 'Bearer token' },
  })),
  assetRequest: vi.fn(async ({ entityId, id }: { entityId: string; id: string }) => ({
    url: `https://entitycore.test/circuit/${entityId}/assets/${id}/download`,
    headers: { Authorization: 'Bearer token' },
  })),
  logError: vi.fn(),
}));

vi.mock('@/features/circuit-viewer/morphologies/load/load', () => import('./pending-loads'));

vi.mock('@/api/one/circuit-visualization', () => ({
  buildCircuitMorphologyPackRequest: h.request,
}));

vi.mock('@/api/entitycore/queries/assets', () => ({ buildAssetDownloadRequest: h.assetRequest }));

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

  it("asks OBI-One for the circuit's pack, in the route's workspace", async () => {
    const { result } = render();
    expect(result.current.load).toEqual({ status: 'loading', received: 0, total: 0 });

    const load = await started();
    expect(h.request).toHaveBeenCalledWith('circuit-id', {
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
    await act(async () => load.resolve(loadedOf(loaded)));
    await ready(result);
    expect(result.current.load).toEqual({ status: 'ready', data: loaded });
    expect([...loaded.somas]).toEqual([0, 0, 0, 5, 30, 0, 0, 4]);
    expect(loaded.bounds.max).toEqual([34, 5, 5]);
    expect(result.current.stopped).toBeNull();
    expect(onStopped).not.toHaveBeenCalled();
  });

  it('asks entitycore for a stored pack, with its size and digest', async () => {
    const stored = { id: 'pack-id', size: 1234, sha256: 'ab12' };
    render({ ...SOURCE, stored });
    const load = await started();

    expect(h.request).not.toHaveBeenCalled();
    expect(h.assetRequest).toHaveBeenCalledWith({
      ctx: { virtualLabId: 'lab', projectId: 'project' },
      entityType: 'circuit',
      entityId: 'circuit-id',
      id: 'pack-id',
    });
    expect(load.options.request).toEqual({
      url: 'https://entitycore.test/circuit/circuit-id/assets/pack-id/download',
      headers: { Authorization: 'Bearer token' },
      stored: { size: 1234, sha256: 'ab12' },
    });
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

  it('says the rest is coming from the moment the morphologies are shown, and while it comes of no total said', async () => {
    const { result } = render();
    const load = await started();
    act(() => load.options.onProgress?.(1e6, 4e6));
    const loaded = data();
    await act(async () => load.resolve(loadedOf(loaded, false, new Promise(() => {}))));

    expect(result.current.load).toEqual({
      status: 'ready',
      data: loaded,
      coming: { received: 1e6, total: 4e6 },
    });
    act(() => load.options.onProgress?.(5e6, 0));
    expect(result.current.load).toEqual({
      status: 'ready',
      data: loaded,
      coming: { received: 5e6, total: 0 },
    });
  });

  it('keeps the morphologies shown where the rest of the pack does not come in, and says so', async () => {
    const { result, onStopped } = render();
    const load = await started();
    const loaded = data();
    const error = new Error('Download not resumed (HTTP 403)');
    await act(async () => load.resolve(loadedOf(loaded, false, Promise.reject(error))));
    await ready(result);

    await waitFor(() => expect(result.current.stopped).toEqual({ kind: 'cut' }));
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
    await waitFor(() => expect(result.current.stopped).toEqual({ kind: 'cut' }));

    act(() => result.current.retry());

    expect(first.options.signal.aborted).toBe(true);
    expect(result.current.stopped).toBeNull();
    expect(result.current.load).toEqual({ status: 'loading', received: 0, total: 0 });
    const second = await started(2);
    expect(second.options.request).toEqual(first.options.request);
  });

  it('forgets a pack cut short once its source goes, as it does not a refusal', async () => {
    const { result, rerender } = render();
    const load = await started();
    await act(async () => load.resolve(loadedOf(data(), false, Promise.reject(new Error('cut')))));
    await waitFor(() => expect(result.current.stopped).toEqual({ kind: 'cut' }));

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
    renderHook(() => useCircuitMorphologies(SOURCE, () => {}), { wrapper: StrictMode });

    await started();
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));

    expect(loads).toHaveLength(1);
    expect(h.request).toHaveBeenCalledTimes(1);
  });
});

describe('storedPackOf', () => {
  const asset = (fields: Partial<IAsset>): IAsset =>
    ({
      id: 'pack-id',
      path: 'circuit.mpack',
      full_path: 'circuit/circuit.mpack',
      bucket_name: 'bucket',
      is_directory: false,
      content_type: 'application/octet-stream',
      size: 1234,
      sha256_digest: 'ab12',
      label: AssetLabel.circuit_morphology_pack,
      status: AssetStatus.CREATED,
      ...fields,
    }) as IAsset;

  it("takes the circuit's pack, of its assets", () => {
    const other = asset({ id: 'config', label: AssetLabel.sonata_circuit, is_directory: true });
    expect(storedPackOf([other, asset({})])).toEqual({ id: 'pack-id', size: 1234, sha256: 'ab12' });
    expect(storedPackOf([asset({ sha256_digest: null })])?.sha256).toBeNull();
  });

  it('takes none where there is no pack whole and kept', () => {
    expect(storedPackOf(undefined)).toBeNull();
    expect(storedPackOf([asset({ label: AssetLabel.sonata_circuit })])).toBeNull();
    expect(storedPackOf([asset({ status: AssetStatus.UPLOADING })])).toBeNull();
    expect(storedPackOf([asset({ status: AssetStatus.DELETED })])).toBeNull();
  });
});
