import type { Layout } from 'plotly.js-dist-min';

/** What the statistics' figures share: their colours, their layout, and how they word a value. */

export const AXIS_COLOR = '#64748b';
export const GRID_COLOR = '#f1f5f9';
/** Groups past the categorical palette: drawn and named on hover, but not given a hue. */
export const OTHER_COLOR = '#cbd5e1';
/** Means grouped by another property than the colours': not a colour of their own, but ink. */
export const MEAN_INK = '#334155';

export const BASE_LAYOUT: Partial<Layout> = {
  autosize: true,
  margin: { l: 56, r: 12, t: 8, b: 8 },
  paper_bgcolor: 'rgba(0,0,0,0)',
  plot_bgcolor: 'rgba(0,0,0,0)',
  font: { size: 11, color: AXIS_COLOR },
  showlegend: false,
  hovermode: 'closest',
};

export const axisTitle = (text: string) => ({ text, font: { size: 11 } });

export function compact(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : String(Number(value.toPrecision(3)));
}

/** A card's title for a group: the one with no property to group by is every cell. */
export function groupName(name: string): string {
  return name === 'All' ? 'All cells' : name;
}

export function cellCount(n: number): string {
  return `${n.toLocaleString()} ${n === 1 ? 'cell' : 'cells'}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
