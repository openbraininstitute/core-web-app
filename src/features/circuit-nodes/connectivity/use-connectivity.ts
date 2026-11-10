import { useQuery } from '@tanstack/react-query';
import * as Comlink from 'comlink';
import { useCallback, useState, useSyncExternalStore } from 'react';

import {
  buildAssetDownloadRequest,
  downloadAsset,
  listDirectoryOfAssets,
} from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { CONNECTIVITY_H5_CACHE } from '@/features/circuit-nodes/connectivity/cache-name';
import { LatestOnly } from '@/features/circuit-nodes/connectivity/latest-only';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type {
  CircuitConnectivityMatricesConfiguration,
  ICircuit,
} from '@/api/entitycore/types/entities/circuit';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { ConnectivityWorkerApi } from '@/features/circuit-nodes/connectivity/connectivity.worker';
import type {
  ConnectivityGroups,
  ConnectivityRequest,
  ConnectivitySummary,
  NodeProperty,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { DownloadProgress } from '@/features/circuit-nodes/types';

const MATRIX_CONFIG = 'matrix_config.json';

/** A matrix of the asset: the edge population it is of, its file and that file's size. */
export type ConnectivityEntry = {
  population: string;
  path: string;
  description: string;
  size: number | null;
};

/**
 * The matrix of each edge population that `matrix_config.json` lists: its
 * `single` one, the digraph, where it has others beside, such as a multigraph.
 */
export function connectivityEntries(
  config: CircuitConnectivityMatricesConfiguration,
  files: DirectoryListContent['files'] | null
): ConnectivityEntry[] {
  return Object.entries(config).flatMap(([population, kinds]) => {
    const entry = kinds.single ?? Object.values(kinds)[0];
    if (!entry?.path) return [];
    const { path, description } = entry;
    return [{ population, path, description, size: files?.[path]?.size ?? null }];
  });
}

export function connectivityAsset(circuit: ICircuit) {
  return circuit.assets?.find((a) => a.label === AssetLabel.circuit_connectivity_matrices);
}

/** The matrices a circuit's connectivity asset holds, with the sizes of their files. */
export function useConnectivityEntries(circuit: ICircuit, enabled: boolean) {
  const ctx = useWorkspace();
  const asset = connectivityAsset(circuit);
  const { data, isLoading, error } = useQuery({
    queryKey: ['circuit-connectivity-matrices', circuit.id, asset?.id],
    enabled: enabled && !!asset,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!asset) throw new Error('The circuit has no connectivity matrices');
      const asCircuit = { ctx, entityType: EntityTypeDict.Circuit, entityId: circuit.id };
      const [config, listing] = await Promise.all([
        downloadAsset({ ...asCircuit, id: asset.id, assetPath: MATRIX_CONFIG, asRawResponse: true })
          .then((response) => response.json())
          .then((json) => json as CircuitConnectivityMatricesConfiguration),
        // Only the sizes come from it, so a matrix still opens without.
        listDirectoryOfAssets({ ...asCircuit, id: asset.id }).catch(() => null),
      ]);
      return connectivityEntries(config, listing?.files ?? null);
    },
  });
  return { asset, entries: data, isLoading, error: error as Error | null };
}

export type ConnectivityState =
  | { status: 'idle' }
  | { status: 'loading'; progress: DownloadProgress | null }
  | { status: 'ready'; summary: ConnectivitySummary }
  | { status: 'error'; error: Error };

const IDLE: ConnectivityState = Object.freeze({ status: 'idle' });

/** How long a matrix is kept once nothing shows it, for a quick way back from the nodes. */
const KEEP_MS = 60_000;

/** The selections and outside properties a worker holds at most, the last asked by. */
const HELD_MAX = 6;
let lastHeldId = 0;

type Session = {
  worker: Worker | null;
  proxy: Comlink.Remote<ConnectivityWorkerApi> | null;
  state: ConnectivityState;
  listeners: Set<() => void>;
  users: number;
  disposeTimer: ReturnType<typeof setTimeout> | null;
  buildRequest: () => Promise<{ url: string; headers: Record<string, string> }>;
  /** A view's requests one at a time, the last of those it made meanwhile. */
  requests: LatestOnly;
  /** What the worker was handed to ask by, and the id of each, the last asked by last. */
  held: Map<Uint32Array | NodeProperty, number>;
};

/** A worker per matrix file on show, shared by whatever shows it and kept a while after. */
class ConnectivitySessions {
  private sessions = new Map<string, Session>();

  state(key: string): ConnectivityState {
    return this.sessions.get(key)?.state ?? IDLE;
  }

  subscribe(key: string, listener: () => void): () => void {
    const session = this.sessions.get(key);
    session?.listeners.add(listener);
    return () => session?.listeners.delete(listener);
  }

  acquire(key: string, buildRequest: Session['buildRequest']): void {
    let session = this.sessions.get(key);
    if (!session) {
      session = {
        worker: null,
        proxy: null,
        state: IDLE,
        listeners: new Set(),
        users: 0,
        disposeTimer: null,
        buildRequest,
        requests: new LatestOnly(),
        held: new Map(),
      };
      this.sessions.set(key, session);
    }
    if (session.disposeTimer) clearTimeout(session.disposeTimer);
    session.disposeTimer = null;
    session.users += 1;
    session.buildRequest = buildRequest;
    if (session.state.status === 'idle') this.open(key, session);
  }

  release(key: string): void {
    const session = this.sessions.get(key);
    if (!session) return;
    session.users = Math.max(0, session.users - 1);
    if (session.users > 0 || session.disposeTimer) return;
    session.disposeTimer = setTimeout(() => {
      if (session.users > 0) return;
      this.teardown(session);
      this.sessions.delete(key);
    }, KEEP_MS);
  }

  retry(key: string): void {
    const session = this.sessions.get(key);
    if (session?.state.status === 'error') this.open(key, session);
  }

  /**
   * The matrix's rows as `request` asks, for the view that is `channel`: one request of a
   * view's at a time, and of those it makes meanwhile only the last, the others failing as
   * superseded. `cells` and `outside` go to the worker once, and are asked by from then on.
   */
  group(
    key: string,
    channel: object,
    request: ConnectivityRequest,
    cells: Uint32Array | null,
    outside: NodeProperty[]
  ): Promise<ConnectivityGroups> {
    const session = this.sessions.get(key);
    if (!session?.proxy) return Promise.reject(new Error('The connectivity matrix is not open'));
    return session.requests.run(channel, async () => {
      const { proxy } = session;
      if (!proxy) throw new Error('The connectivity matrix is not open');
      const ids = [...(cells ? [cells] : []), ...outside].map((item) => {
        let id = session.held.get(item);
        session.held.delete(item);
        if (id === undefined) {
          lastHeldId += 1;
          id = lastHeldId;
          // Sent ahead of the request, which fails if this did.
          const sent =
            item instanceof Uint32Array ? proxy.holdCells(id, item) : proxy.holdProperty(id, item);
          sent.catch(() => {});
        }
        session.held.set(item, id);
        return id;
      });
      const dropped: number[] = [];
      for (const [item, id] of session.held) {
        if (session.held.size <= HELD_MAX) break;
        session.held.delete(item);
        dropped.push(id);
      }
      if (dropped.length > 0) proxy.forget(dropped).catch(() => {});
      return proxy.group(request, cells ? ids[0] : null, cells ? ids.slice(1) : ids);
    });
  }

  private setState(session: Session, state: ConnectivityState): void {
    session.state = state;
    for (const listener of session.listeners) listener();
  }

  private async open(key: string, session: Session): Promise<void> {
    this.teardown(session);
    this.setState(session, { status: 'loading', progress: null });
    const worker = new Worker(new URL('./connectivity.worker.ts', import.meta.url), {
      type: 'module',
    });
    const proxy = Comlink.wrap<ConnectivityWorkerApi>(worker);
    session.worker = worker;
    session.proxy = proxy;
    // A session torn down or reopened meanwhile has another proxy by the time this answers.
    const current = () => this.sessions.get(key) === session && session.proxy === proxy;
    try {
      const { url, headers } = await session.buildRequest();
      const summary = await proxy.open(
        { url, headers, fileKey: key.replaceAll('/', '_') },
        Comlink.proxy((progress: DownloadProgress) => {
          if (current()) this.setState(session, { status: 'loading', progress });
        })
      );
      if (current()) this.setState(session, { status: 'ready', summary });
    } catch (e) {
      if (!current()) return;
      this.teardown(session);
      this.setState(session, {
        status: 'error',
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  private teardown(session: Session): void {
    const { proxy, worker } = session;
    session.proxy = null;
    session.worker = null;
    session.held.clear();
    session.requests.reset(new Error('The connectivity matrix was closed'));
    proxy?.[Comlink.releaseProxy]();
    worker?.terminate();
  }
}

export const connectivitySessions = new ConnectivitySessions();

/** A matrix of a circuit's connectivity asset, opened in a worker, and its rows on request. */
export function useConnectivityMatrix(
  circuitId: string,
  assetId: string | undefined,
  entry: ConnectivityEntry | undefined
) {
  const ctx = useWorkspace();
  const key = assetId && entry ? `${circuitId}/${assetId}/${entry.path}` : null;
  const path = entry?.path;
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key || !assetId || !path) return () => {};
      connectivitySessions.acquire(key, () =>
        buildAssetDownloadRequest({
          ctx,
          entityType: EntityTypeDict.Circuit,
          entityId: circuitId,
          id: assetId,
          assetPath: path,
        })
      );
      const unsubscribe = connectivitySessions.subscribe(key, onChange);
      return () => {
        unsubscribe();
        connectivitySessions.release(key);
      };
    },
    [key, ctx, circuitId, assetId, path]
  );
  const state = useSyncExternalStore(subscribe, () =>
    key ? connectivitySessions.state(key) : IDLE
  );
  const [channel] = useState(() => ({}));
  const group = useCallback(
    (request: ConnectivityRequest, cells: Uint32Array | null, outside: NodeProperty[]) =>
      key
        ? connectivitySessions.group(key, channel, request, cells, outside)
        : Promise.reject(new Error('No connectivity matrix')),
    [key, channel]
  );
  const retry = useCallback(() => {
    if (key) connectivitySessions.retry(key);
  }, [key]);
  return { state, key, group, retry };
}

/** Past this a matrix is downloaded only once asked for, after the view says how big it is. */
export const CONFIRM_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/** The large matrices the user has said to download, this visit: each is asked about once. */
const allowedDownloads = new Set<string>();
const allowedListeners = new Set<() => void>();

function subscribeAllowed(listener: () => void): () => void {
  allowedListeners.add(listener);
  return () => allowedListeners.delete(listener);
}

function allowDownload(key: string): void {
  allowedDownloads.add(key);
  for (const listener of allowedListeners) listener();
}

/**
 * Whether a matrix waits for the user's word before downloading: one past
 * {@link CONFIRM_DOWNLOAD_BYTES} or of unknown size, not yet in the browser's cache, and not
 * already allowed.
 * `checking` while the cache is asked.
 */
export function useConnectivityDownloadGate(
  circuitId: string,
  assetId: string | undefined,
  entry: ConnectivityEntry | undefined
) {
  const ctx = useWorkspace();
  const key = assetId && entry ? `${circuitId}/${assetId}/${entry.path}` : null;
  const path = entry?.path;
  const large = entry != null && (entry.size == null || entry.size > CONFIRM_DOWNLOAD_BYTES);
  const allowed = useSyncExternalStore(
    subscribeAllowed,
    () => key !== null && allowedDownloads.has(key),
    () => false
  );
  const asks = large && !allowed && key !== null;
  // The worker files a download under its URL, so a matrix fetched before needs no asking.
  const cached = useQuery({
    queryKey: ['connectivity-matrix-cached', key],
    queryFn: async () => {
      if (!assetId || !path) return false;
      const { url } = await buildAssetDownloadRequest({
        ctx,
        entityType: EntityTypeDict.Circuit,
        entityId: circuitId,
        id: assetId,
        assetPath: path,
      });
      const cache = await caches.open(CONNECTIVITY_H5_CACHE);
      return Boolean(await cache.match(url));
    },
    enabled: asks,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const allow = useCallback(() => {
    if (key) allowDownload(key);
  }, [key]);
  return {
    /** waiting for the user's word */
    waiting: asks && cached.data !== true,
    checking: asks && cached.isLoading,
    allow,
  };
}
