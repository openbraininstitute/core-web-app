'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

type SceneTablePane = {
  /** Whether the pane is up, as the scene's table button asks. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The pane's room, which the scene draws its table into. */
  target: HTMLElement | null;
  /** Taken by a scene that can list its cells while it is mounted; returns the release. */
  claim: () => () => void;
};

const SceneTablePaneContext = createContext<SceneTablePane | null>(null);

/**
 * A pane of its own for a 3D scene's nodes table, laid out by the host beside
 * the scene rather than over it. Returns what the provider hands the scene,
 * whether the pane should be up - asked for, and a scene there to fill it -
 * and the setter for its room.
 */
export function useSceneTablePaneHost() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [claims, setClaims] = useState(0);
  const claim = useCallback(() => {
    setClaims((n) => n + 1);
    return () => setClaims((n) => n - 1);
  }, []);
  const value = useMemo(
    () => ({ open, onOpenChange: setOpen, target, claim }),
    [open, target, claim]
  );
  return { value, shown: open && claims > 0, setTarget };
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
