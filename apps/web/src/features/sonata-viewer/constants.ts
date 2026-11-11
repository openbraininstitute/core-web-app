export const CHART_LINE_COLOR = '#0050b3';

/**
 * The categorical palette, in this fixed order, which clears the colour-blind
 * checks between neighbours: a plot's groups take it, and past its end go grey
 * rather than take a hue nobody could tell apart.
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

/**
 * One colour per cell picked to draw, so every line has its own and a name in
 * the legend: the palette's hues, then each darker, then each lighter, so a
 * line's hue tells it from the picks around it. A pick keeps its slot while
 * others come and go; past the last, the colours come round again.
 */
export const TRACE_COLORS: readonly string[] = [
  ...PICK_COLORS,
  // A third of the way to black.
  '#1b4e8b',
  '#994422',
  '#12724f',
  '#9a6900',
  '#97506b',
  '#005500',
  '#40348b',
  '#942f2f',
  // A third of the way to white.
  '#75a7e4',
  '#f29d7b',
  '#6bcba9',
  '#f3c259',
  '#f0a9c4',
  '#59ae59',
  '#998de4',
  '#ed8988',
];
