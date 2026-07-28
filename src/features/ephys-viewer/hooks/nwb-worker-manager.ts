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

export type TraceSessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TraceSessionState {
  status: TraceSessionStatus;
  index: TraceIndex | null;
  progress: DownloadProgress | null;
  error: Error | null;
}

/** Stable reference for "no session yet" so React reads don't loop on identity. */
export const IDLE_TRACE_SESSION_STATE: TraceSessionState = Object.freeze({
  status: 'idle',
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
 * Decimated series to keep per session, most recently used first.
 *
 * Producing one means reading whole sweeps out of the file and decimating them, so holding on to
 * the recent ones is what makes switching back to a view it already drew instant rather than a
 * second round of spinners. A repetition takes one entry for the detail-resolution read plus one
 * for each coarser view taken from it, and zooming mints one per window — which is what the cap
 * is for.
 */
const SERIES_CACHE_SIZE = 48;

interface Session {
  key: string;
  worker: Worker | null;
  proxy: Comlink.Remote<NWBTraceWorkerApi> | null;
  buildRequest: TraceOpenParams['buildRequest'];
  state: TraceSessionState;
  /** Decimated series already read out of this file, keyed by the request that produced them. */
  seriesCache: Map<string, SweepSeriesResponse>;
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
        state: IDLE_TRACE_SESSION_STATE,
        seriesCache: new Map(),
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
    if (session.state.status === 'idle') this.open(session);
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
    if (!session || session.state.status !== 'error') return;
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

    const hit = this.readCache(session, req);
    if (hit) return hit;

    const source = sourceRequest(req);
    if (source.desiredLength === req.desiredLength) return null;

    const cachedSource = this.readCache(session, source);
    if (!cachedSource) return null;

    // Stored rather than just returned: callers compare successive reads by identity, and
    // reducing afresh on every render would hand back a new object each time.
    return this.writeCache(session, req, reduceSweepSeries(cachedSource, req.desiredLength));
  }

  async getSweepSeries(key: string, req: SweepSeriesRequest): Promise<SweepSeriesResponse> {
    const cached = this.getCachedSweepSeries(key, req);
    if (cached) return cached;

    const session = this.sessions.get(key);
    if (!session?.proxy || session.state.status !== 'ready') {
      throw new Error('NWB worker not ready');
    }

    const source = sourceRequest(req);
    const series = await session.proxy.getSweepSeries(source);
    this.writeCache(session, source, series);

    if (source.desiredLength === req.desiredLength) return series;

    return this.writeCache(session, req, reduceSweepSeries(series, req.desiredLength));
  }

  private readCache(session: Session, req: SweepSeriesRequest): SweepSeriesResponse | null {
    const cacheKey = JSON.stringify(req);
    const hit = session.seriesCache.get(cacheKey);
    if (!hit) return null;

    // Re-insert so it counts as the most recently used.
    session.seriesCache.delete(cacheKey);
    session.seriesCache.set(cacheKey, hit);

    return hit;
  }

  private writeCache(
    session: Session,
    req: SweepSeriesRequest,
    series: SweepSeriesResponse
  ): SweepSeriesResponse {
    session.seriesCache.set(JSON.stringify(req), series);

    if (session.seriesCache.size > SERIES_CACHE_SIZE) {
      // A Map iterates in insertion order, so the first key is the least recently used.
      const oldest = session.seriesCache.keys().next().value;
      if (oldest !== undefined) session.seriesCache.delete(oldest);
    }

    return series;
  }

  private setState(session: Session, patch: Partial<TraceSessionState>): void {
    session.state = { ...session.state, ...patch };
    for (const listener of session.listeners) listener();
  }

  private async open(session: Session): Promise<void> {
    session.epoch += 1;
    const { epoch } = session;
    // Discard any previous worker (e.g. on retry) before starting fresh. Its series went with
    // the file it read them from.
    this.teardownWorker(session);
    session.seriesCache.clear();
    this.setState(session, { status: 'loading', index: null, progress: null, error: null });

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
      const index = await proxy.open(
        request,
        Comlink.proxy((next: DownloadProgress) => {
          if (session.epoch !== epoch) return;
          this.setState(session, { progress: next });
        })
      );
      if (session.epoch !== epoch) return;

      this.setState(session, { status: 'ready', index, progress: null, error: null });
    } catch (e) {
      if (session.epoch !== epoch) return;
      this.teardownWorker(session);
      this.setState(session, {
        status: 'error',
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
