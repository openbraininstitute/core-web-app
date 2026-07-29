import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CANVAS_LIGHT, normalizeCanvasBackground } from './contrast';

import type { ViewerConfig } from './types';

const STORAGE_PREFIX = 'obi:circuit-viewer-config:v1:';

/**
 * in-house flag: when true, the per-circuit viewer config is persisted to (and
 * restored from) localStorage. Default OFF — config lives only in memory and
 * resets on reload, and no "reset saved view" control is shown.
 */
export const PERSIST_VIEWER_CONFIG = false;

/** Full opacity — default for circuit viewers outside electrode-focused hosts. */
export const DEFAULT_NEURON_OPACITY = 1;

/**
 * Dimmed neurons so electrode markers stay readable. Hosts that place /
 * inspect electrodes (e.g. extracellular recording array campaign or details)
 * should pass this as {@link resolveViewerConfigDefaults}'s `defaultNeuronOpacity`.
 */
export const ELECTRODE_FOCUSED_NEURON_OPACITY = 0.2;

/**
 * Electrode marker radius in world units — also the viewer-controls slider min.
 *
 * Why small: contacts read as a probe rather than a string of beads, and the
 * per-pixel floor keeps them visible when the camera pulls back.
 */
export const DEFAULT_ELECTRODE_RADIUS = 5;

/** Baseline viewer defaults (full neuron opacity, electrode size 5). */
export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  colorByProperty: null,
  backgroundColor: CANVAS_LIGHT,
  showAxons: false,
  neuronOpacity: DEFAULT_NEURON_OPACITY,
  showElectrodes: true,
  electrodeRadius: DEFAULT_ELECTRODE_RADIUS,
  colorOverrides: {},
};

export function resolveViewerConfigDefaults(options?: {
  /** Initial neuron opacity (0–1). Hosts set this; viewer does not infer context. */
  defaultNeuronOpacity?: number;
}): ViewerConfig {
  const neuronOpacity = options?.defaultNeuronOpacity ?? DEFAULT_NEURON_OPACITY;
  if (neuronOpacity === DEFAULT_VIEWER_CONFIG.neuronOpacity) return DEFAULT_VIEWER_CONFIG;
  return {
    ...DEFAULT_VIEWER_CONFIG,
    neuronOpacity,
  };
}

function storageKey(circuitId: string): string {
  return `${STORAGE_PREFIX}${circuitId}`;
}

function readConfig(circuitId: string, defaults: ViewerConfig): ViewerConfig | null {
  if (!PERSIST_VIEWER_CONFIG) return null;
  try {
    const raw = globalThis.localStorage?.getItem(storageKey(circuitId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewerConfig>;
    return {
      ...defaults,
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
export function useViewerConfig(
  circuitId: string,
  options?: { defaultNeuronOpacity?: number }
): UseViewerConfig {
  const defaultNeuronOpacity = options?.defaultNeuronOpacity ?? DEFAULT_NEURON_OPACITY;
  const defaults = useMemo(
    () => resolveViewerConfigDefaults({ defaultNeuronOpacity }),
    [defaultNeuronOpacity]
  );
  const [config, setConfig] = useState<ViewerConfig>(defaults);
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  // avoid persisting the initial restore back to storage.
  const hydratedRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;
    const saved = readConfig(circuitId, defaults);
    setConfig(saved ?? defaults);
    setHasSavedConfig(saved !== null);
    hydratedRef.current = true;
  }, [circuitId, defaults]);

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
    setConfig(defaults);
    setHasSavedConfig(false);
  }, [circuitId, defaults]);

  return { config, hasSavedConfig, update, reset };
}
