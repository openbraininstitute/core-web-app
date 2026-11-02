'use client';

import { createContext, useCallback, useContext, useEffect, useRef } from 'react';

import { nodesWorkerRegistry } from '@/features/circuit-nodes/hooks/nodes-worker-manager';

import type { ReactNode } from 'react';
import type { NodesOpenParams } from '@/features/circuit-nodes/hooks/nodes-worker-manager';

/** How many of the node populations read under a keeper stay open, the latest first. */
const KEPT_SESSIONS = 3;

const NodesSessionKeeperContext = createContext<
  ((key: string, params: NodesOpenParams) => void) | null
>(null);

/**
 * Keeps the last few nodes sessions opened under it open for as long as it is
 * mounted. A results page remounts its viewer for each report and simulation,
 * and the next one reads its own file before it asks for its cells: by then a
 * session nobody holds is gone, and the same population would be read again.
 */
export function NodesSessionKeeper({ children }: { children: ReactNode }) {
  const kept = useRef(new Map<string, true>());
  const keep = useCallback((key: string, params: NodesOpenParams) => {
    const sessions = kept.current;
    // Kept already: it is the latest now.
    if (sessions.delete(key)) {
      sessions.set(key, true);
      return;
    }
    nodesWorkerRegistry.acquire(key, params);
    sessions.set(key, true);
    for (const oldest of sessions.keys()) {
      if (sessions.size <= KEPT_SESSIONS) break;
      sessions.delete(oldest);
      nodesWorkerRegistry.release(oldest);
    }
  }, []);
  useEffect(() => {
    const sessions = kept.current;
    return () => {
      for (const key of sessions.keys()) nodesWorkerRegistry.release(key);
      sessions.clear();
    };
  }, []);
  return (
    <NodesSessionKeeperContext.Provider value={keep}>{children}</NodesSessionKeeperContext.Provider>
  );
}

/** The keeper a nodes session opened here is handed to, if there is one. */
export function useNodesSessionKeeper() {
  return useContext(NodesSessionKeeperContext);
}
