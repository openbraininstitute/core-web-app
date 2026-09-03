import type { ColumnKind } from '@/features/circuit-nodes/types';

/** how the neurons are currently colored */
export const ColorModeDict = {
  None: 'none',
  Categorical: 'categorical',
  Continuous: 'continuous',
} as const;
export type ColorMode = (typeof ColorModeDict)[keyof typeof ColorModeDict];

/** a single entry of the categorical (scrollable) key */
export interface CategoricalLegendEntry {
  /** raw property value (as string) this swatch represents */
  value: string;
  /** display color: background-adapted, used for the swatch dot and the 3D view */
  color: string;
  /** the untuned color the user edits/owns (override or base palette color); the
   * color picker is seeded from this so committing a pick doesn't snap the handle */
  rawColor: string;
  /** number of neurons carrying this value (for optional display) */
  count: number;
}

/** continuous (scale-bar) key description */
export interface ContinuousLegend {
  min: number;
  max: number;
  /** ordered gradient stops (low → high) used to render the scale bar */
  gradient: string[];
}

/**
 * compact per-node coloring: a bounded palette of display colors plus the
 * palette column each node samples. The typed array is the only per-node
 * allocation, so recoloring a region-scale circuit costs one array copy
 * instead of a string per node.
 */
export interface NodeColors {
  /** distinct display colors: at most MAX_DISTINCT_COLORS for a key, CONTINUOUS_STOPS for a scale */
  palette: string[];
  /** palette index per node, aligned by node index. Empty when mode === 'none' */
  columnByNode: Uint16Array;
}

/**
 * the result of mapping a node property onto colors: the per-node palette
 * (see {@link NodeColors}), plus the legend needed to render the key
 */
export interface ColorMapping extends NodeColors {
  mode: ColorMode;
  /** property name being colored by, or null when mode === 'none' */
  property: string | null;
  categorical?: CategoricalLegendEntry[];
  continuous?: ContinuousLegend;
}

/** a property the user can color by, surfaced in the dropdown */
export interface ColorByProperty {
  name: string;
  kind: ColumnKind;
  /** human-friendly label (e.g. "M-type" for `mtype`) */
  label: string;
}

/**
 * user color overrides, keyed by property name then raw value → hex color.
 * e.g. `{ etype: { cADpyr: '#ff0000' } }`. Empty by default (auto palette).
 */
export type ColorOverrides = Record<string, Record<string, string>>;

/** persisted, per-circuit viewer configuration */
export interface ViewerConfig {
  /**
   * Selected colour-by property, by population name; absent or null for the
   * default (blue). Stored per population because the property list is per
   * population: a property one population has, another may not. Returning to a
   * population restores the choice made there.
   */
  colorByProperty: Record<string, string | null>;
  /**
   * Populations the user has taken out of the scene, by name; anything not
   * named is drawn. The exceptions are stored, not the visible set, so a
   * population this list has never heard of is on screen rather than missing.
   *
   * `null` while the user has not touched the checklist, which is when the
   * default applies: a circuit's virtual populations start out of the scene.
   * Distinct from `[]`, which the user can ask for with "Show all" or by
   * unticking the last hidden row, and which has to stick.
   */
  hiddenPopulations: string[] | null;
  backgroundColor: string;
  showAxons: boolean;
  /**
   * Neuron / soma paint opacity (0–1). Default 1; hosts may pass a lower
   * initial value (e.g. 0.2) when electrode overlays should dominate.
   */
  neuronOpacity: number;
  /** Show electrode location overlays when present. Default on. */
  showElectrodes: boolean;
  /**
   * World-space electrode marker radius (morphoviewer overlaysRadius).
   * Defaults to {@link DEFAULT_ELECTRODE_RADIUS}.
   */
  electrodeRadius: number;
  /**
   * World-space radius of the morphology-location markers.
   * Defaults to {@link DEFAULT_MORPHOLOGY_LOCATION_RADIUS}.
   */
  morphologyLocationRadius: number;
  /** Show a `Type[section]` tag beside each selected morphology location. */
  showMorphologyLocationLabels: boolean;
  /** Show the zoom slider over the canvas. */
  showZoomSlider: boolean;
  /** Show the scalebar down the side of the canvas. */
  showScalebar: boolean;
  /** per-property, per-value color overrides chosen by the user */
  colorOverrides: ColorOverrides;
}
