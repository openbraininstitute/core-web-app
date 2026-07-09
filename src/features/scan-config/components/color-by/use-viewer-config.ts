import { useCallback, useEffect, useRef, useState } from 'react';

import { CANVAS_LIGHT, normalizeCanvasBackground } from './contrast';

import type { ViewerConfig } from './types';

const STORAGE_PREFIX = 'obi:circuit-viewer-config:v1:';

/**
 * in-house flag: when true, the per-circuit viewer config is persisted to (and
 * restored from) localStorage. Default OFF — config lives only in memory and
 * resets on reload, and no "reset saved view" control is shown.
 */
export const PERSIST_VIEWER_CONFIG = false;

export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  colorByProperty: null,
  backgroundColor: CANVAS_LIGHT,
  showAxons: false,
  colorOverrides: {},
};

function storageKey(circuitId: string): string {
  return `${STORAGE_PREFIX}${circuitId}`;
}

function readConfig(circuitId: string): ViewerConfig | null {
  if (!PERSIST_VIEWER_CONFIG) return null;
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(circuitId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewerConfig>;
    return {
      ...DEFAULT_VIEWER_CONFIG,
      ...parsed,
      backgroundColor: normalizeCanvasBackground(parsed.backgroundColor ?? CANVAS_LIGHT),
    };
  } catch {
    return null;
  }
}

interface UseViewerConfig {
  config: ViewerConfig;
  /** true when a saved config already exists for this circuit (gates the reset toggle) */
  hasSavedConfig: boolean;
  update: (patch: Partial<ViewerConfig>) => void;
  reset: () => void;
}

/**
 * persist the viewer configuration per circuit in localStorage and restore it on
 * the next visit. the saved-config flag lets the ui show a "reset" control only
 * when the user has configured this circuit before.
 */
export function useViewerConfig(circuitId: string): UseViewerConfig {
  const [config, setConfig] = useState<ViewerConfig>(DEFAULT_VIEWER_CONFIG);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  // avoid persisting the initial restore back to storage.
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    const saved = readConfig(circuitId);
    setConfig(saved ?? DEFAULT_VIEWER_CONFIG);
    setHasSavedConfig(saved !== null);
    hydratedRef.current = true;
  }, [circuitId]);

  const update = useCallback(
    (patch: Partial<ViewerConfig>) => {
      setConfig((prev) => {
        const next = {
          ...prev,
          ...patch,
          ...(patch.backgroundColor !== undefined && {
            backgroundColor: normalizeCanvasBackground(patch.backgroundColor),
          }),
        };
        if (PERSIST_VIEWER_CONFIG && hydratedRef.current) {
          try {
            globalThis.localStorage?.setItem(storageKey(circuitId), JSON.stringify(next));
            setHasSavedConfig(true);
          } catch {
            /* ignore quota / unavailable storage */
          }
        }
        return next;
      });
    },
    [circuitId]
  );

  const reset = useCallback(() => {
    try {
      globalThis.localStorage?.removeItem(storageKey(circuitId));
    } catch {
      /* ignore */
    }
    setConfig(DEFAULT_VIEWER_CONFIG);
    setHasSavedConfig(false);
  }, [circuitId]);

  return { config, hasSavedConfig, update, reset };
}
