'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useServices } from './context';

import type { Kernel, KernelSpec, ServiceManager, Session } from '@jupyterlab/services';

export type KernelStatus = Kernel.Status | 'disconnected' | 'no-kernel';

export interface SessionHandle {
  session: Session.ISessionConnection | null;
  kernel: Kernel.IKernelConnection | null;
  status: KernelStatus;
  /** Kernel display name, e.g. "Python 3 (ipykernel)". */
  displayName: string;
  specs: KernelSpec.ISpecModels | null;
  starting: boolean;
  error: string | null;
  start: (kernelName?: string) => Promise<void>;
  restart: () => Promise<void>;
  interrupt: () => Promise<void>;
  shutdown: () => Promise<void>;
  changeKernel: (kernelName: string) => Promise<void>;
}

/**
 * Owns the Jupyter session for one notebook path. A session is only created on
 * demand — opening a notebook does not spin up a kernel until something needs
 * to execute, matching JupyterLab's behaviour of connecting to an existing
 * session if the server already has one for this path.
 */
/** The document's own kernelspec wins, but only if the server actually has it. */
function resolveKernelName(svc: ServiceManager.IManager, preferred?: string): string {
  const specs = svc.kernelspecs.specs;
  if (preferred && specs?.kernelspecs?.[preferred]) return preferred;
  return specs?.default ?? 'python3';
}

export function useSession(
  path: string | null,
  /** Kernelspec the document asks for; used only if the server has it. */
  preferredKernel?: string,
  autoStart = false
): SessionHandle {
  const services = useServices();
  const [session, setSession] = useState<Session.ISessionConnection | null>(null);
  const [status, setStatus] = useState<KernelStatus>('no-kernel');
  const [specs, setSpecs] = useState<KernelSpec.ISpecModels | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session.ISessionConnection | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;
  const preferredRef = useRef(preferredKernel);
  preferredRef.current = preferredKernel;

  useEffect(() => {
    let cancelled = false;
    services.kernelspecs.ready
      .then(() => {
        if (!cancelled) setSpecs(services.kernelspecs.specs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [services]);

  const attach = useCallback((next: Session.ISessionConnection | null) => {
    sessionRef.current = next;
    setSession(next);
    setStatus(next?.kernel?.status ?? 'no-kernel');
  }, []);

  // Mirror kernel status into React state.
  useEffect(() => {
    if (!session) {
      setStatus('no-kernel');
      return;
    }
    const sync = () => setStatus(session.kernel?.status ?? 'no-kernel');
    sync();
    const onStatus = () => sync();
    const onConnection = () => {
      const cs = session.kernel?.connectionStatus;
      setStatus(cs === 'disconnected' ? 'disconnected' : (session.kernel?.status ?? 'no-kernel'));
    };
    session.kernelChanged.connect(sync);
    session.statusChanged.connect(onStatus);
    session.connectionStatusChanged.connect(onConnection);
    return () => {
      session.kernelChanged.disconnect(sync);
      session.statusChanged.disconnect(onStatus);
      session.connectionStatusChanged.disconnect(onConnection);
    };
  }, [session]);

  const start = useCallback(
    async (kernelName?: string) => {
      const target = pathRef.current;
      if (!target) return;
      if (sessionRef.current?.kernel) return;
      setStarting(true);
      setError(null);
      try {
        const svc = services;
        await svc.ready;

        const existing = await svc.sessions.findByPath(target);
        const connection = existing
          ? svc.sessions.connectTo({ model: existing })
          : await svc.sessions.startNew({
              path: target,
              type: 'notebook',
              name: target.split('/').pop() ?? target,
              kernel: { name: kernelName ?? resolveKernelName(svc, preferredRef.current) },
            });
        attach(connection);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setStarting(false);
      }
    },
    [attach, services]
  );

  useEffect(() => {
    if (autoStart && path && !sessionRef.current) void start();
  }, [autoStart, path, start]);

  // Dispose the client-side connection when switching files. The server-side
  // session stays alive so kernel variables survive a tab switch.
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup keyed on path only
  useEffect(() => {
    return () => {
      sessionRef.current?.dispose();
      sessionRef.current = null;
    };
  }, [path]);

  const restart = useCallback(async () => {
    const kernel = sessionRef.current?.kernel;
    if (!kernel) return start();
    setError(null);
    try {
      await kernel.restart();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, [start]);

  const interrupt = useCallback(async () => {
    try {
      await sessionRef.current?.kernel?.interrupt();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }, []);

  const shutdown = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    try {
      await current.shutdown();
    } catch {
      // Already gone server-side; drop the client connection either way.
    }
    current.dispose();
    attach(null);
  }, [attach]);

  const changeKernel = useCallback(
    async (kernelName: string) => {
      const current = sessionRef.current;
      if (!current) return start(kernelName);
      setStarting(true);
      try {
        await current.changeKernel({ name: kernelName });
        setStatus(current.kernel?.status ?? 'no-kernel');
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setStarting(false);
      }
    },
    [start]
  );

  const kernel = session?.kernel ?? null;
  const specName = kernel?.name;
  const displayName =
    (specName && specs?.kernelspecs?.[specName]?.display_name) || specName || 'No kernel';

  return {
    session,
    kernel,
    status,
    displayName,
    specs,
    starting,
    error,
    start,
    restart,
    interrupt,
    shutdown,
    changeKernel,
  };
}
