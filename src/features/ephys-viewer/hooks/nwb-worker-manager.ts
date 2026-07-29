import * as Comlink from 'comlink';

import { DETAIL_PLOT_POINTS } from '@/features/ephys-viewer/constants';
import { reduceSweepSeries } from '@/features/ephys-viewer/reduce-series';

import type {
  OpenTraceRequest,
  SweepSeriesRequest,
  SweepSeriesResponse,
  TraceIndex,
} from '@/features/ephys-viewer/trace-index';
import type { NWBTraceWorkerApi } from '@/features/ephys-viewer/worker/nwb.worker';
import type { DownloadProgress } from '@/utils/h5/fs';

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

/** What the viewer renders from: the file's structure, or how far off it is. */
export interface TraceSessionState {
  index: TraceIndex | null;
  progress: DownloadProgress | null;
  error: Error | null;
}

/** Stable reference for "no session yet" so React reads don't loop on identity. */
export const IDLE_TRACE_SESSION_STATE: TraceSessionState = Object.freeze({
  index: null,
  progress: null,
  error: null,
});

export interface TraceOpenParams {
  /** Builds the (short-lived, signed) download request; called once per open. */
  buildRequest: () => Promise<{ url: string; headers: Record<string, string> }>;
}

/**
 * Keep a released (ref-count 0) session alive briefly so a StrictMode remount or a quick
 * tab switch reuses it instead of re-downloading a few hundred megabytes.
 */
const DISPOSE_GRACE_MS = 1500;

/**
 * Plot points to keep per session, across the repetitions read at detail resolution.
 *
 * Producing one means reading whole sweeps out of the file and decimating them, so holding on to
 * the recent ones is what makes switching back to a view it already drew instant rather than a
 * second round of spinners. Budgeting points rather than entries is what keeps that honest: a
 * repetition costs `sweeps × recordings × 2 × DETAIL_PLOT_POINTS` points, which is two hundred
 * thousand for a two-sweep pair and forty times that for a forty-sweep file with six recordings.
 * At eight bytes a point this caps the main thread's share at roughly 40 MB either way.
 */
const SERIES_POINT_BUDGET = 5_000_000;

/**
 * Zoom windows to keep, budgeted apart from the repetitions above.
 *
 * A window is keyed by the range Plotly reports for the drag that made it, so two gestures
 * practically never produce the same key and an entry stops being useful the moment the plot
 * leaves that window. Drawn from the same budget, a handful of them would evict the
 * whole-repetition reads that are still worth having.
 */
const WINDOW_CACHE_SIZE = 4;

/**
 * One read of the file, with the coarser views taken from it.
 *
 * Reductions hang off their source rather than taking a cache slot of their own: they are free
 * to remint from it and worthless without it, so letting them compete for room with the reads
 * they came from would trade an expensive entry for a cheap one.
 */
interface SeriesEntry {
  source: SweepSeriesResponse;
  /** Plot points held by `source`, which dominates — reductions are a tenth of it or less. */
  points: number;
  /** Coarser views of `source`, by the point count that was asked for. */
  reductions: Map<number, SweepSeriesResponse>;
}

interface Session {
  key: string;
  worker: Worker | null;
  proxy: Comlink.Remote<NWBTraceWorkerApi> | null;
  buildRequest: TraceOpenParams['buildRequest'];
  /** Drives the registry's own guards; the viewer reads `state`, which is derived from the same
   * transitions but carries only what it renders. */
  status: SessionStatus;
  state: TraceSessionState;
  /** Whole repetitions already read out of this file, keyed by the request that produced them. */
  seriesCache: Map<string, SeriesEntry>;
  /** Zoom windows, kept apart so they can't crowd out `seriesCache`. */
  windowCache: Map<string, SeriesEntry>;
  listeners: Set<() => void>;
  refCount: number;
  /** Bumped on every (re)open and on disposal, so stale async results are dropped. */
  epoch: number;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Registry of NWB worker sessions, keyed by entity + asset. The file is streamed into the
 * worker's Emscripten FS and stays there for the session, so the main thread only ever holds
 * the trace index and the decimated series it asked for.
 */
class NWBWorkerRegistry {
  private sessions = new Map<string, Session>();

  getState(key: string): TraceSessionState {
    return this.sessions.get(key)?.state ?? IDLE_TRACE_SESSION_STATE;
  }

  subscribe(key: string, listener: () => void): () => void {
    const session = this.sessions.get(key);
    if (!session) return () => {};
    session.listeners.add(listener);
    return () => {
      session.listeners.delete(listener);
    };
  }

  acquire(key: string, params: TraceOpenParams): void {
    let session = this.sessions.get(key);
    if (!session) {
      session = {
        key,
        worker: null,
        proxy: null,
        buildRequest: params.buildRequest,
        status: 'idle',
        state: IDLE_TRACE_SESSION_STATE,
        seriesCache: new Map(),
        windowCache: new Map(),
        listeners: new Set(),
        refCount: 0,
        epoch: 0,
        disposeTimer: null,
      };
      this.sessions.set(key, session);
    }
    if (session.disposeTimer) {
      clearTimeout(session.disposeTimer);
      session.disposeTimer = null;
    }
    session.refCount += 1;
    // Keep the freshest request builder around for retries, which re-sign the URL.
    session.buildRequest = params.buildRequest;
    if (session.status === 'idle') this.open(session);
  }

  release(key: string): void {
    const session = this.sessions.get(key);
    if (!session) return;
    session.refCount = Math.max(0, session.refCount - 1);
    if (session.refCount === 0 && !session.disposeTimer) {
      session.disposeTimer = setTimeout(() => this.dispose(session), DISPOSE_GRACE_MS);
    }
  }

  retry(key: string): void {
    const session = this.sessions.get(key);
    if (!session || session.status !== 'error') return;
    this.open(session);
  }

  /**
   * The series for a request if it was already read, without crossing into the worker.
   *
   * Callers use this to render a repeat request on the first frame; going through
   * `getSweepSeries` would resolve just as fast but only after a paint, which is a spinner.
   */
  getCachedSweepSeries(key: string, req: SweepSeriesRequest): SweepSeriesResponse | null {
    const session = this.sessions.get(key);
    if (!session) return null;

    const entry = this.readEntry(session, sourceRequest(req));

    return entry && viewOf(entry, req.desiredLength);
  }

  async getSweepSeries(key: string, req: SweepSeriesRequest): Promise<SweepSeriesResponse> {
    const cached = this.getCachedSweepSeries(key, req);
    if (cached) return cached;

    const session = this.sessions.get(key);
    if (!session?.proxy || session.status !== 'ready') {
      throw new Error('NWB worker not ready');
    }

    const source = sourceRequest(req);
    const entry = this.writeEntry(session, source, await session.proxy.getSweepSeries(source));

    return viewOf(entry, req.desiredLength);
  }

  private readEntry(session: Session, source: SweepSeriesRequest): SeriesEntry | null {
    const cache = cacheFor(session, source);
    const cacheKey = JSON.stringify(source);
    const entry = cache.get(cacheKey);
    if (!entry) return null;

    // Re-insert so it counts as the most recently used.
    cache.delete(cacheKey);
    cache.set(cacheKey, entry);

    return entry;
  }

  private writeEntry(
    session: Session,
    source: SweepSeriesRequest,
    series: SweepSeriesResponse
  ): SeriesEntry {
    const entry: SeriesEntry = {
      source: series,
      points: countPoints(series),
      reductions: new Map(),
    };

    const cache = cacheFor(session, source);
    cache.set(JSON.stringify(source), entry);
    evictDownToBudget(cache, cache === session.windowCache);

    return entry;
  }

  /** Move a session to a new status, and to the state the viewer should render at it. */
  private transition(session: Session, status: SessionStatus, state: TraceSessionState): void {
    session.status = status;
    session.state = state;
    for (const listener of session.listeners) listener();
  }

  /** Report download progress without disturbing the status the session is in. */
  private setProgress(session: Session, progress: DownloadProgress): void {
    session.state = { ...session.state, progress };
    for (const listener of session.listeners) listener();
  }

  private async open(session: Session): Promise<void> {
    session.epoch += 1;
    const { epoch } = session;
    // Discard any previous worker (e.g. on retry) before starting fresh. Its series went with
    // the file it read them from.
    this.teardownWorker(session);
    session.seriesCache.clear();
    session.windowCache.clear();
    this.transition(session, 'loading', { index: null, progress: null, error: null });

    try {
      const worker = new Worker(new URL('../worker/nwb.worker.ts', import.meta.url), {
        type: 'module',
      });
      const proxy = Comlink.wrap<NWBTraceWorkerApi>(worker);
      if (session.epoch !== epoch) {
        proxy[Comlink.releaseProxy]();
        worker.terminate();
        return;
      }
      session.worker = worker;
      session.proxy = proxy;

      const { url, headers } = await session.buildRequest();
      if (session.epoch !== epoch) return;

      const request: OpenTraceRequest = { fileKey: session.key, url, headers };
      // The worker holds this callback for as long as its port lives, so it looks the session up
      // by key rather than closing over it — capturing it would pin the whole series cache past
      // disposal.
      const { key } = session;
      const index = await proxy.open(
        request,
        Comlink.proxy((next: DownloadProgress) => {
          const current = this.sessions.get(key);
          if (!current || current.epoch !== epoch) return;
          this.setProgress(current, next);
        })
      );
      if (session.epoch !== epoch) return;

      this.transition(session, 'ready', { index, progress: null, error: null });
    } catch (e) {
      if (session.epoch !== epoch) return;
      this.teardownWorker(session);
      this.transition(session, 'error', {
        index: null,
        progress: null,
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  private dispose(session: Session): void {
    if (session.refCount > 0) return; // Re-acquired during the grace window.
    session.epoch += 1;
    session.disposeTimer = null;
    this.teardownWorker(session);
    session.listeners.clear();
    this.sessions.delete(session.key);
  }

  private teardownWorker(session: Session): void {
    const { proxy, worker } = session;
    session.proxy = null;
    session.worker = null;
    // Terminating the worker frees the whole WASM heap, and with it the file; releasing the
    // Comlink proxy first avoids dangling message ports.
    if (proxy) {
      try {
        proxy[Comlink.releaseProxy]();
      } catch {
        /* ignore */
      }
    }
    if (worker) {
      try {
        worker.terminate();
      } catch {
        /* ignore */
      }
    }
  }
}

export const nwbWorkerRegistry = new NWBWorkerRegistry();

/**
 * The request actually put to the worker.
 *
 * What a read costs is set by how many samples come out of the file, not by how many points go
 * back — so a repetition is always read at detail resolution and anything coarser is reduced
 * from that. Asking for more than the detail resolution is honoured as it stands.
 */
function sourceRequest(req: SweepSeriesRequest): SweepSeriesRequest {
  const desiredLength = Math.max(req.desiredLength, DETAIL_PLOT_POINTS);

  return desiredLength === req.desiredLength ? req : { ...req, desiredLength };
}

/** Which of a session's two caches a request belongs in — see `WINDOW_CACHE_SIZE`. */
function cacheFor(session: Session, req: SweepSeriesRequest): Map<string, SeriesEntry> {
  const windowed = req.xStart !== undefined || req.xEnd !== undefined;

  return windowed ? session.windowCache : session.seriesCache;
}

/**
 * An entry at the requested resolution, reducing from its source the first time each coarser
 * view is asked for.
 *
 * The reduction is kept rather than just returned: callers compare successive reads by identity,
 * and reducing afresh on every render would hand back a new object each time.
 */
function viewOf(entry: SeriesEntry, desiredLength: number): SweepSeriesResponse {
  // Anything at or above the read resolution is the read itself; see `sourceRequest`.
  if (desiredLength >= DETAIL_PLOT_POINTS) return entry.source;

  const existing = entry.reductions.get(desiredLength);
  if (existing) return existing;

  const reduced = reduceSweepSeries(entry.source, desiredLength);
  entry.reductions.set(desiredLength, reduced);

  return reduced;
}

/** Plot points in a response, summed across every recording and sweep. */
function countPoints(series: SweepSeriesResponse): number {
  return Object.values(series)
    .flat()
    .reduce(
      (total, recording) => total + recording.series.reduce((sum, { y }) => sum + y.length, 0),
      0
    );
}

/**
 * Drop least-recently-used entries until the cache is back within budget, always leaving the
 * one just written — evicting that would mean re-reading it on the very next render.
 */
function evictDownToBudget(cache: Map<string, SeriesEntry>, isWindowCache: boolean): void {
  if (isWindowCache) {
    while (cache.size > WINDOW_CACHE_SIZE) {
      // A Map iterates in insertion order, so the first key is the least recently used.
      const oldest = cache.keys().next().value;
      if (oldest === undefined) return;
      cache.delete(oldest);
    }
    return;
  }

  let total = 0;
  for (const entry of cache.values()) total += entry.points;

  for (const [cacheKey, entry] of cache) {
    if (total <= SERIES_POINT_BUDGET || cache.size <= 1) return;
    cache.delete(cacheKey);
    total -= entry.points;
  }
}
