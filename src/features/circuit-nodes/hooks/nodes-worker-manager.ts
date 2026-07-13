import * as Comlink from 'comlink';

import { config } from '@/config';

import type {
  ColumnKind,
  ColumnMeta,
  DownloadProgress,
  GetRowsRequest,
  GetRowsResponse,
  OpenRequest,
} from '@/features/circuit-nodes/types';
import type { NodesWorkerApi } from '@/features/circuit-nodes/worker/nodes.worker';

export type LoadedColumnResult = { kind: ColumnKind; values: (string | number)[] };

export type NodesSessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface NodesSessionState {
  status: NodesSessionStatus;
  columns?: ColumnMeta[];
  rowCount: number;
  progress: DownloadProgress | null;
  error: Error | null;
}

/** stable reference for "no session yet" so React reads don't loop on identity */
export const IDLE_SESSION_STATE: NodesSessionState = Object.freeze({
  status: 'idle',
  columns: undefined,
  rowCount: 0,
  progress: null,
  error: null,
});

export interface NodesOpenParams {
  populationKey: string;
  /** builds the (short-lived, signed) download request; called once per open */
  buildRequest: () => Promise<{ url: string; headers: Record<string, string> }>;
}

/** keep a released (ref-count 0) session alive briefly so a StrictMode remount
 * or a quick table toggle reuses it instead of re-downloading. */
const DISPOSE_GRACE_MS = 1500;

interface Session {
  key: string;
  populationKey: string;
  worker: Worker | null;
  proxy: Comlink.Remote<NodesWorkerApi> | null;
  buildRequest: NodesOpenParams['buildRequest'];
  state: NodesSessionState;
  listeners: Set<() => void>;
  refCount: number;
  /** bumped on every (re)open and on disposal, so stale async results are dropped */
  epoch: number;
  disposed: boolean;
  disposeTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * app registry of nodes-worker sessions, keyed by circuit + asset +
 * population (which uniquely identifies the SONATA file). The circuit table and
 * the colour-by dropdown consume the same key,
 * a different key — a different circuit/population, e.g. after switching workflow
 * is an independent session, so a new workflow always gets fresh data
 * and can never observe the previous circuit's.
 */
class NodesWorkerRegistry {
  private sessions = new Map<string, Session>();

  getState(key: string): NodesSessionState {
    return this.sessions.get(key)?.state ?? IDLE_SESSION_STATE;
  }

  getSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  subscribe(key: string, listener: () => void): () => void {
    const session = this.sessions.get(key);
    if (!session) return () => {};
    session.listeners.add(listener);
    return () => {
      session.listeners.delete(listener);
    };
  }

  acquire(key: string, params: NodesOpenParams): void {
    let session = this.sessions.get(key);
    if (!session) {
      session = {
        key,
        populationKey: params.populationKey,
        worker: null,
        proxy: null,
        buildRequest: params.buildRequest,
        state: IDLE_SESSION_STATE,
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
    // keep the freshest request builder around for retries (re-signs the URL)
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

  async getRows(key: string, req: GetRowsRequest): Promise<GetRowsResponse> {
    const session = this.sessions.get(key);
    if (!session?.proxy || session.state.status !== 'ready') {
      throw new Error('Nodes worker not ready');
    }
    return session.proxy.getRows(req);
  }

  getColumn(key: string, name: string): Promise<LoadedColumnResult> {
    const session = this.sessions.get(key);
    if (!session?.proxy) return Promise.reject(new Error('Nodes worker not ready'));
    return session.proxy.getColumn(name);
  }

  private setState(session: Session, patch: Partial<NodesSessionState>): void {
    session.state = { ...session.state, ...patch };
    for (const listener of session.listeners) listener();
  }

  private async open(session: Session): Promise<void> {
    session.epoch += 1;
    const epoch = session.epoch;
    // discard any previous worker (e.g. on retry) before starting fresh
    this.teardownWorker(session);
    this.setState(session, {
      status: 'loading',
      columns: undefined,
      rowCount: 0,
      progress: null,
      error: null,
    });

    try {
      const worker = new Worker(new URL('../worker/nodes.worker.ts', import.meta.url), {
        type: 'module',
      });
      const proxy = Comlink.wrap<NodesWorkerApi>(worker);
      if (session.disposed || session.epoch !== epoch) {
        proxy[Comlink.releaseProxy]();
        worker.terminate();
        return;
      }
      session.worker = worker;
      session.proxy = proxy;

      const { url, headers } = await session.buildRequest();
      if (session.disposed || session.epoch !== epoch) return;

      const request: OpenRequest = {
        populationKey: session.populationKey,
        fileKey: session.key,
        url,
        headers,
      };
      const result = await proxy.open(
        request,
        Comlink.proxy((next: DownloadProgress) => {
          if (session.disposed || session.epoch !== epoch) return;
          this.setState(session, { progress: next });
        })
      );
      if (session.disposed || session.epoch !== epoch) return;

      this.setState(session, {
        status: 'ready',
        columns: result.columns,
        rowCount: result.rowCount,
        progress: null,
        error: null,
      });
    } catch (e) {
      if (session.disposed || session.epoch !== epoch) return;
      this.teardownWorker(session);
      this.setState(session, {
        status: 'error',
        columns: undefined,
        rowCount: 0,
        progress: null,
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  private dispose(session: Session): void {
    if (session.refCount > 0) return; // re-acquired during the grace window
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
    // terminating the worker frees the whole WASM heap (the ~700MB file); a
    // release of the comlink proxy first avoids dangling message ports.
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

export const nodesWorkerRegistry = new NodesWorkerRegistry();

if (config.DEPLOYMENT_ENV !== 'production') {
  (globalThis as typeof globalThis & { __nodesWorker?: NodesWorkerRegistry }).__nodesWorker =
    nodesWorkerRegistry;
}
