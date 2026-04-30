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

export const MARGIN = { top: 20, right: 20, bottom: 60, left: 70 };

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

  draw(bounds: ViewBounds, plotRect: PlotRect) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;

    const xTickCount = Math.max(2, Math.floor(plotRect.width / 80));
    const yTickCount = Math.max(2, Math.floor(plotRect.height / 30));
    const xTicks = computeTicks(bounds.xMin, bounds.xMax, xTickCount);
    const yTicks = computeTicks(bounds.yMin, bounds.yMax, yTickCount, true);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    this.drawBackground(ctx, plotRect);
    this.drawGrid(ctx, bounds, plotRect, xTicks, yTicks);
    this.drawAxes(ctx, bounds, plotRect, xTicks, yTicks);
    this.drawAxisTitles(ctx, plotRect, ctx.canvas.height / dpr);

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
    xTicks: number[],
    yTicks: number[]
  ) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (const v of xTicks) {
      const px = rect.x + ((v - bounds.xMin) / (bounds.xMax - bounds.xMin)) * rect.width;
      ctx.moveTo(px, rect.y);
      ctx.lineTo(px, rect.y + rect.height);
    }

    for (const v of yTicks) {
      const py =
        rect.y + rect.height - ((v - bounds.yMin) / (bounds.yMax - bounds.yMin)) * rect.height;
      ctx.moveTo(rect.x, py);
      ctx.lineTo(rect.x + rect.width, py);
    }

    ctx.stroke();
  }

  private drawAxes(
    ctx: CanvasRenderingContext2D,
    bounds: ViewBounds,
    rect: PlotRect,
    xTicks: number[],
    yTicks: number[]
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

    for (const v of xTicks) {
      const px = rect.x + ((v - bounds.xMin) / xRange) * rect.width;
      ctx.beginPath();
      ctx.moveTo(px, rect.y + rect.height);
      ctx.lineTo(px, rect.y + rect.height + 5);
      ctx.stroke();
      ctx.fillText(formatTick(v, xStep), px, rect.y + rect.height + 8);
    }

    // Y-axis ticks and labels
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (const v of yTicks) {
      const py = rect.y + rect.height - ((v - bounds.yMin) / yRange) * rect.height;
      ctx.beginPath();
      ctx.moveTo(rect.x - 5, py);
      ctx.lineTo(rect.x, py);
      ctx.stroke();
      ctx.fillText(formatTick(v, yStep), rect.x - 8, py);
    }
  }

  private drawAxisTitles(ctx: CanvasRenderingContext2D, rect: PlotRect, canvasH: number) {
    ctx.fillStyle = '#333333';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';

    // X-axis title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Time (ms)', rect.x + rect.width / 2, canvasH - 4);

    // Y-axis title (rotated)
    ctx.save();
    const yCenter = rect.y + rect.height / 2;
    ctx.translate(14, yCenter);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Neuron ID', 0, 0);
    ctx.restore();
  }
}
