import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { majorTick, Scalebar } from '@/features/viewer-3d/chrome/scalebar';

import type { ViewControls } from '@/features/viewer-3d/engine/scene-viewer';

/** A 2D context that keeps the labels it is asked to write, and how high each is. */
function fakeContext() {
  const labels: string[] = [];
  const heights: number[] = [];
  const context = {
    labels,
    heights,
    setTransform() {},
    clearRect: vi.fn(() => {
      labels.splice(0);
      heights.splice(0);
    }),
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText: (text: string, _x: number, y: number) => {
      labels.push(text);
      heights.push(y);
    },
    measureText: () => ({ actualBoundingBoxAscent: 7, actualBoundingBoxDescent: 1, width: 30 }),
  };
  return context;
}

function fakeViewer(scale: number | null) {
  const listeners = new Set<(scale: number | null) => void>();
  return {
    currentPixelScale: scale,
    onPixelScaleChange(listener: (scale: number | null) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onViewChange: () => () => {},
    viewAlong() {},
    listeners,
    tell(next: number | null) {
      for (const listener of listeners) listener(next);
    },
  } satisfies ViewControls & Record<string, unknown>;
}

describe('the scale bar', () => {
  let context: ReturnType<typeof fakeContext>;

  beforeEach(() => {
    context = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // jsdom's canvas is 150 pixels high: 140 between the labels' pads, a major tick at least 24 apart.
  it('labels its major ticks in round numbers of the unit that suits the scale', () => {
    render(<Scalebar viewer={fakeViewer(1)} color="#fff" />);
    expect(context.labels).toEqual(['0 μm', '25 μm', '50 μm', '75 μm', '100 μm', '125 μm']);
  });

  it('puts each major tick where its value is, the ruler as long as the ticks that fit', () => {
    render(<Scalebar viewer={fakeViewer(0.4)} color="#fff" />);
    // 10 µm at 0.4 µm a pixel are 25 pixels, which fit 5 times in 140.
    expect(context.labels.at(-1)).toBe('50 μm');
    const gaps = context.heights.slice(1).map((y, m) => context.heights[m] - y);
    expect(gaps).toEqual([25, 25, 25, 25, 25]);
  });

  it('follows the viewer, and lets go of it when it goes', () => {
    const viewer = fakeViewer(1);
    const { unmount } = render(<Scalebar viewer={viewer} color="#fff" />);
    act(() => viewer.tell(1000));
    expect(context.labels[1]).toBe('25 mm');
    unmount();
    expect(viewer.listeners.size).toBe(0);
  });

  it('draws nothing without a scale, in perspective', () => {
    const viewer = fakeViewer(null);
    render(<Scalebar viewer={viewer} color="#fff" />);
    expect(context.labels).toEqual([]);
    act(() => viewer.tell(1));
    act(() => viewer.tell(null));
    expect(context.clearRect).toHaveBeenCalled();
    expect(context.labels).toEqual([]);
  });
});

describe('a major tick', () => {
  it('stands for the largest round number that fits the space a tick may take, in the unit that keeps it whole', () => {
    const micrometres = majorTick(140, 1, 24);
    expect(micrometres).toMatchObject({ value: 25, unit: 'μm' });
    expect(micrometres.step).toBeCloseTo(25);
    const millimetres = majorTick(140, 1000, 24);
    expect(millimetres).toMatchObject({ value: 25, unit: 'mm' });
    expect(millimetres.step).toBeCloseTo(25);
    expect(majorTick(140, 0.001, 24)).toMatchObject({ value: 25, unit: 'nm' });
  });
});
