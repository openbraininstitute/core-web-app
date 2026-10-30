import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CANVAS_LIGHT, normalizeCanvasBackground } from './contrast';

import type { CircuitRepresentation, ViewerConfig } from './types';

// v2: `colorByProperty` went from `string | null` to a per-population record.
const STORAGE_PREFIX = 'obi:circuit-viewer-config:v2:';

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

export const DEFAULT_SOMA_SIZE_SCALE = 1;

/**
 * Electrode marker radius in world units — also the viewer-controls slider min.
 *
 * Why small: contacts read as a probe rather than a string of beads, and the
 * per-pixel floor keeps them visible when the camera pulls back.
 */
export const DEFAULT_ELECTRODE_RADIUS = 5;

/** Default radius of a morphology-location marker, in world units. */
export const DEFAULT_MORPHOLOGY_LOCATION_RADIUS = 3;

/** Baseline viewer defaults (full neuron opacity, electrode size 5). */
export const DEFAULT_VIEWER_CONFIG: ViewerConfig = {
  representation: 'somas',
  colorByProperty: {},
  // Not decided here: the populations arrive long after the config is built.
  // @see ViewerConfig.hiddenPopulations
  hiddenPopulations: null,
  backgroundColor: CANVAS_LIGHT,
  showAxons: false,
  neuronOpacity: DEFAULT_NEURON_OPACITY,
  somaSizeScale: DEFAULT_SOMA_SIZE_SCALE,
  showElectrodes: true,
  electrodeRadius: DEFAULT_ELECTRODE_RADIUS,
  morphologyLocationRadius: DEFAULT_MORPHOLOGY_LOCATION_RADIUS,
  // Off by default: the tags are useful when reading a selection back, and clutter while
  // placing one. Re-projecting them costs a little work on every frame, so leaving them off
  // also keeps orbiting free for anyone who does not want them.
  showMorphologyLocationLabels: false,
  // Off by default: scroll already zooms, so the slider is for people who want a readout
  // and a handle rather than a wheel.
  showZoomSlider: false,
  showScalebar: true,
  spin: false,
  colorOverrides: {},
};

interface ViewerConfigDefaults {
  /** Initial neuron opacity (0–1). Hosts set this; viewer does not infer context. */
  defaultNeuronOpacity?: number;
  /** What the cells are drawn as to begin with, and again on reset. */
  defaultRepresentation?: CircuitRepresentation;
}

export function resolveViewerConfigDefaults(options: ViewerConfigDefaults = {}): ViewerConfig {
  return {
    ...DEFAULT_VIEWER_CONFIG,
    neuronOpacity: options.defaultNeuronOpacity ?? DEFAULT_VIEWER_CONFIG.neuronOpacity,
    representation: options.defaultRepresentation ?? DEFAULT_VIEWER_CONFIG.representation,
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

/**
 * A patch, or what to patch given what is already there. The second form is for
 * the per-population and per-property settings, whose patch has to carry every
 * entry but the one being changed.
 */
type ViewerConfigPatch =
  | Partial<ViewerConfig>
  | ((previous: ViewerConfig) => Partial<ViewerConfig>);

interface UseViewerConfig {
  config: ViewerConfig;
  /** true when a saved config already exists for this circuit (gates the reset toggle) */
  hasSavedConfig: boolean;
  update: (patch: ViewerConfigPatch) => void;
  reset: () => void;
}

/**
 * persist the viewer configuration per circuit in localStorage and restore it on
 * the next visit. the saved-config flag lets the ui show a "reset" control only
 * when the user has configured this circuit before.
 */
export function useViewerConfig(
  circuitId: string,
  options?: ViewerConfigDefaults
): UseViewerConfig {
  const { defaultNeuronOpacity, defaultRepresentation } = options ?? {};
  const defaults = useMemo(
    () => resolveViewerConfigDefaults({ defaultNeuronOpacity, defaultRepresentation }),
    [defaultNeuronOpacity, defaultRepresentation]
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
    (patch: ViewerConfigPatch) => {
      setConfig((prev) => {
        const resolved = typeof patch === 'function' ? patch(prev) : patch;
        const next = {
          ...prev,
          ...resolved,
          ...(resolved.backgroundColor !== undefined && {
            backgroundColor: normalizeCanvasBackground(resolved.backgroundColor),
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
