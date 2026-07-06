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
  /** resolved color for this value */
  color: string;
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
  /** per-property, per-value color overrides chosen by the user */
  colorOverrides: ColorOverrides;
}
