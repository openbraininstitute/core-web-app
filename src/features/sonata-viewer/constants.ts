export const CHART_LINE_COLOR = '#0050b3';

/**
 * One colour per cell picked to draw, in this fixed order: the
 * categorical palette whose order clears the colour-blind checks between
 * neighbours. A pick keeps its slot while others come and go; past the eighth,
 * a pick is drawn grey rather than given a hue nobody could tell apart.
 */
export const PICK_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#6250d6',
  '#e34948',
] as const;
