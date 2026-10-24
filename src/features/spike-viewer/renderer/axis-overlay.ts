export type ViewBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type PlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// The top band is clearance for the controls floating in the pane's top-right:
// an h-8 button and a little air, so the icons never sit on the spikes. Only
// each axis's two end ticks are labelled, and its title takes the space
// between them, so the bottom and left bands hold one row of text each.
export const MARGIN = { top: 36, right: 20, bottom: 28, left: 56 };

/**
 * How the y axis reads when its rows are not node ids: runs of rows under a
 * label each, such as a layer, or a value at each row, such as a rate.
 */
export type RowAxis = {
  title: string;
  groups?: { label: string; start: number; end: number }[];
  valueAt?: (row: number) => string;
};

/** Compute nice tick values for an axis range. When integer is true, step is constrained to an integer >= 1. */
function computeTicks(min: number, max: number, targetCount: number, integer = false): number[] {
  const range = max - min;
  if (range <= 0) return [min];

  const rawStep = range / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3.5) niceStep = 2 * magnitude;
  else if (residual <= 7.5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  if (integer) niceStep = Math.max(1, Math.round(niceStep));

  const ticks: number[] = [];
  const start = Math.ceil(min / niceStep) * niceStep;
  for (let v = start; v <= max + niceStep * 0.001; v += niceStep) {
    ticks.push(v);
  }
  return ticks;
}

/** Format a tick value to a reasonable number of decimal places. */
function formatTick(value: number, step: number): string {
  if (step >= 1) return Math.round(value).toString();
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return value.toFixed(decimals);
}

export class AxisOverlay {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
  }

  draw(bounds: ViewBounds, plotRect: PlotRect, rows?: RowAxis) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;

    const xTickCount = Math.max(2, Math.floor(plotRect.width / 80));
    const yTickCount = Math.max(2, Math.floor(plotRect.height / 30));
    const xTicks = computeTicks(bounds.xMin, bounds.xMax, xTickCount);
    const yTicks = computeTicks(bounds.yMin, bounds.yMax, yTickCount, true).filter((v) => v >= 0);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    this.drawBackground(ctx, plotRect);
    this.drawGrid(ctx, bounds, plotRect, xTicks);
    this.drawAxes(ctx, bounds, plotRect, xTicks, yTicks, rows);
    // Groups label the axis all along, where the title would sit on them.
    this.drawAxisTitles(ctx, plotRect, rows?.groups ? null : (rows?.title ?? 'Neuron ID'));

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, rect: PlotRect) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    xTicks: number[]
  ) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (const v of xTicks) {
      const px = rect.x + ((v - bounds.xMin) / (bounds.xMax - bounds.xMin)) * rect.width;
      ctx.moveTo(px, rect.y);
      ctx.lineTo(px, rect.y + rect.height);
    }

    ctx.stroke();
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    xTicks: number[],
    yTicks: number[],
    rows: RowAxis | undefined
  ) {
    const xRange = bounds.xMax - bounds.xMin;
    const yRange = bounds.yMax - bounds.yMin;
    const xStep = xTicks.length > 1 ? xTicks[1] - xTicks[0] : 1;
    const yStep = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1;

    // Axis lines
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.height);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height);
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rect.x, rect.y + rect.height);
    ctx.stroke();

    // X-axis ticks and labels
    ctx.fillStyle = '#333333';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    xTicks.forEach((v, i) => {
      const px = rect.x + ((v - bounds.xMin) / xRange) * rect.width;
      ctx.beginPath();
      ctx.moveTo(px, rect.y + rect.height);
      ctx.lineTo(px, rect.y + rect.height + 5);
      ctx.stroke();
      if (i === 0 || i === xTicks.length - 1) {
        ctx.fillText(formatTick(v, xStep), px, rect.y + rect.height + 8);
      }
    });

    // Y-axis ticks and labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    if (rows?.groups) {
      this.drawGroups(ctx, bounds, rect, rows.groups);
      return;
    }
    yTicks.forEach((v, i) => {
      const py = rect.y + rect.height - ((v - bounds.yMin) / yRange) * rect.height;
      ctx.beginPath();
      ctx.moveTo(rect.x - 5, py);
      ctx.lineTo(rect.x, py);
      ctx.stroke();
      if (i === 0 || i === yTicks.length - 1) {
        ctx.fillText(rows?.valueAt ? rows.valueAt(v) : formatTick(v, yStep), rect.x - 8, py);
      }
    });
  }

  /** A rule between groups of rows, and each group's label beside its middle where it fits. */
  private drawGroups(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    groups: NonNullable<RowAxis['groups']>
  ) {
    const yAt = (row: number) =>
      rect.y + rect.height - ((row - bounds.yMin) / (bounds.yMax - bounds.yMin)) * rect.height;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    ctx.save();
    ctx.strokeStyle = '#d4d4d4';
    ctx.beginPath();
    for (const group of groups.slice(1)) {
      const py = Math.round(yAt(group.start - 0.5)) + 0.5;
      if (py <= top || py >= bottom) continue;
      ctx.moveTo(rect.x - 5, py);
      ctx.lineTo(rect.x + rect.width, py);
    }
    ctx.stroke();

    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
    const room = MARGIN.left - 12;
    for (const group of groups) {
      const from = Math.max(top, yAt(group.end - 0.5));
      const to = Math.min(bottom, yAt(group.start - 0.5));
      if (to - from < 11) continue;
      ctx.fillText(fitted(ctx, group.label, room), rect.x - 8, (from + to) / 2);
    }
    ctx.restore();
  }

  /** On the tick labels' own rows, midway between the two that are drawn. */
  private drawAxisTitles(ctx: CanvasRenderingContext2D, rect: PlotRect, yTitle: string | null) {
    ctx.fillStyle = '#333333';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';

    // X-axis title, level with the end labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Time (ms)', rect.x + rect.width / 2, rect.y + rect.height + 8);

    if (yTitle === null) return;
    // Y-axis title, rotated, flush with the end labels' right edge
    ctx.save();
    ctx.translate(rect.x - 8, rect.y + rect.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(yTitle, 0, 0);
    ctx.restore();
  }
}

/** The text, cut short with an ellipsis where it is wider than `width`. */
function fitted(ctx: CanvasRenderingContext2D, text: string, width: number): string {
  if (ctx.measureText(text).width <= width) return text;
  let end = text.length;
  while (end > 1 && ctx.measureText(`${text.slice(0, end)}…`).width > width) end -= 1;
  return `${text.slice(0, end)}…`;
}
