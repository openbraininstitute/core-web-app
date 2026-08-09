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
 * the result of mapping a node property onto colors: a per-node color array
 * aligned by node index, plus the legend needed to render the key
 */
export interface ColorMapping {
  mode: ColorMode;
  /** property name being colored by, or null when mode === 'none' */
  property: string | null;
  /** per-node colors, aligned by node index. Empty when mode === 'none' */
  colorsByNode: string[];
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
  /** selected color-by property name, or null for the default (blue) */
  colorByProperty: string | null;
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
  /** per-property, per-value color overrides chosen by the user */
  colorOverrides: ColorOverrides;
}
