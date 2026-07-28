import * as Comlink from 'comlink';

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

interface Session {
  key: string;
  worker: Worker | null;
  proxy: Comlink.Remote<NWBTraceWorkerApi> | null;
  buildRequest: TraceOpenParams['buildRequest'];
  state: TraceSessionState;
  listeners: Set<() => void>;
  refCount: number;
  /** Bumped on every (re)open and on disposal, so stale async results are dropped. */
  epoch: number;
  disposed: boolean;
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
        listeners: new Set(),
        refCount: 0,
        epoch: 0,
        disposed: false,
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

  getSweepSeries(key: string, req: SweepSeriesRequest): Promise<SweepSeriesResponse> {
    const session = this.sessions.get(key);
    if (!session?.proxy || session.state.status !== 'ready') {
      return Promise.reject(new Error('NWB worker not ready'));
    }
    return session.proxy.getSweepSeries(req);
  }

  private setState(session: Session, patch: Partial<TraceSessionState>): void {
    session.state = { ...session.state, ...patch };
    for (const listener of session.listeners) listener();
  }

  private async open(session: Session): Promise<void> {
    session.epoch += 1;
    const { epoch } = session;
    // Discard any previous worker (e.g. on retry) before starting fresh.
    this.teardownWorker(session);
    this.setState(session, { status: 'loading', index: null, progress: null, error: null });

    try {
      const worker = new Worker(new URL('../worker/nwb.worker.ts', import.meta.url), {
        type: 'module',
      });
      const proxy = Comlink.wrap<NWBTraceWorkerApi>(worker);
      if (session.disposed || session.epoch !== epoch) {
        proxy[Comlink.releaseProxy]();
        worker.terminate();
        return;
      }
      session.worker = worker;
      session.proxy = proxy;

      const { url, headers } = await session.buildRequest();
      if (session.disposed || session.epoch !== epoch) return;

      const request: OpenTraceRequest = { fileKey: session.key, url, headers };
      const index = await proxy.open(
        request,
        Comlink.proxy((next: DownloadProgress) => {
          if (session.disposed || session.epoch !== epoch) return;
          this.setState(session, { progress: next });
        })
      );
      if (session.disposed || session.epoch !== epoch) return;

      this.setState(session, { status: 'ready', index, progress: null, error: null });
    } catch (e) {
      if (session.disposed || session.epoch !== epoch) return;
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
    session.disposed = true;
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
