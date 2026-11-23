import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RasterRenderer } from '@/features/spike-viewer/renderer/raster-renderer';

import type { RasterWindow } from '@/features/spike-viewer/renderer/raster-renderer';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

// What draws is left out: these tests are about what the plot is zoomed to.
vi.mock('@/features/spike-viewer/renderer/webgl-points', () => ({
  WebGLPoints: class {
    onRestored: (() => void) | null = null;
    destroy() {}
    draw() {}
    resize() {}
    setData() {}
    setSpikeColors() {}
    setSpikeRows() {}
    setVisibility() {}
  },
}));
vi.mock('@/features/spike-viewer/renderer/axis-overlay', () => ({
  AxisOverlay: class {
    draw() {}
  },
}));

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
});
afterEach(() => vi.unstubAllGlobals());

const population = (nodeIds: number[]): SpikePopulation => ({
  name: 'S1',
  nodeIds: Float64Array.from(nodeIds),
  timestamps: Float32Array.from(nodeIds, (_, i) => i * 100),
  nodeIdRange: { min: 0, max: 49 },
});
// The file's span, as the host hands it over, and the population's own rows after.
const FILE = { xMin: 0, xMax: 1000, yMin: -0.5, yMax: 99.5 };

function zoomedRaster() {
  const renderer = new RasterRenderer(document.createElement('div'));
  const windows: (RasterWindow | null)[] = [];
  renderer.onWindowChange = (window) => windows.push(window);
  renderer.setData([population([0, 10, 20, 30, 40])], FILE);
  renderer.setYBounds(-0.5, 49.5);
  renderer.setTimeWindow(200, 400);
  return { renderer, windows };
}

describe('RasterRenderer zoom', () => {
  it('keeps the zoom when the same spikes come cut to fewer cells', () => {
    const { renderer, windows } = zoomedRaster();
    expect(windows.at(-1)?.time).toEqual([200, 400]);
    const reported = windows.length;

    // a nodes table's filter, or its rows fetched again, while zoomed in
    renderer.setData([population([10, 30])], FILE);
    renderer.setYBounds(-0.5, 49.5);

    expect(windows).toHaveLength(reported);
    renderer.destroy();
  });

  it('zooms back out for another span', () => {
    const { renderer, windows } = zoomedRaster();

    renderer.setData([population([10, 30])], { ...FILE, xMax: 2000 });

    expect(windows.at(-1)).toBeNull();
    renderer.destroy();
  });
});
