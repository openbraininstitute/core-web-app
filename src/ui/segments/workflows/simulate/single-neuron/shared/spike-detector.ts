import type { PlotData } from './types';

export function detectSpikeTimes(
  plots: Record<string, PlotData>,
  peakMinSize = 0.1,
  peakMinHeight = Number.NEGATIVE_INFINITY
): Record<string, PlotData> {
  for (const name of Object.keys(plots)) {
    const plot = plots[name];
    for (const line of plot) {
      const spikeTimes: number[] = [];
      let candidate: { x: number; y: number } | null = null;
      for (const [x, y, top] of iteratePeaks(line)) {
        if (candidate === null) {
          if (top) candidate = { x, y };
        } else {
          if (!top) {
            if (Math.abs(candidate.y - y) > peakMinSize && candidate.y > peakMinHeight) {
              spikeTimes.push(candidate.x);
            }
            candidate = null;
          }
        }
      }
      line.spikeTimes = spikeTimes;
    }
  }
  return plots;
}

function* iteratePeaks(line: {
  x: number[];
  y: number[];
}): Generator<[x: number, y: number, top: boolean], void, unknown> {
  let dyy: number | null = null;
  for (const [x, y, dy] of iterateCoords(line)) {
    if (dyy !== null) {
      if (sign(dy) !== sign(dyy)) {
        yield [x, y, dyy > 0];
      }
    }
    dyy = dy;
  }
}

function* iterateCoords(line: {
  x: number[];
  y: number[];
}): Generator<[x: number, y: number, dy: number], void, unknown> {
  let yy: number | null = null;
  for (let i = 0; i < line.x.length; i++) {
    const x = line.x[i];
    const y = line.y[i];
    const dy = y - (yy ?? y);
    yield [x, y, dy];
    yy = y;
  }
}

function sign(value: number) {
  if (value === 0) return 0;
  return value > 0 ? +1 : -1;
}
