'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

type SceneTablePane = {
  /** The pane's room, which the scene draws its table into. */
  target: HTMLElement | null;
  /** Taken by a scene that can list its cells while it is mounted; returns the release. */
  claim: () => () => void;
};

const SceneTablePaneContext = createContext<SceneTablePane | null>(null);

/**
 * A pane of its own for a 3D scene's nodes table, laid out by the host beside
 * the scene rather than over it, and up whenever a scene is there to fill it.
 * Returns what the provider hands the scene, whether the pane is up, and the
 * setter for its room.
 */
export function useSceneTablePaneHost() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [claims, setClaims] = useState(0);
  const claim = useCallback(() => {
    setClaims((n) => n + 1);
    return () => setClaims((n) => n - 1);
  }, []);
  const value = useMemo(() => ({ target, claim }), [target, claim]);
  return { value, shown: claims > 0, setTarget };
}

export function SceneTablePaneProvider({
  value,
  children,
}: {
  value: SceneTablePane;
  children: ReactNode;
}) {
  return <SceneTablePaneContext.Provider value={value}>{children}</SceneTablePaneContext.Provider>;
}

/** The host's pane for the scene's nodes table, where there is one. */
export function useSceneTablePane() {
  return useContext(SceneTablePaneContext);
}
