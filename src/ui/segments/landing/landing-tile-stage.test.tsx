import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const renderer = vi.hoisted(() => ({
  showChosen: null as null | (() => void),
  layouts: [] as boolean[],
}));

vi.mock('./landing-tile-renderer', () => ({
  createLandingTileRenderer: (
    _canvas: unknown,
    _picks: unknown,
    options: { reduced: boolean; heroAbove: boolean; onReady: () => void; onShowChosen: () => void }
  ) => {
    renderer.layouts.push(options.heroAbove);
    options.onReady();
    renderer.showChosen = options.onShowChosen;
    // with reduced motion the renderer shows the chosen example at once
    if (options.reduced) options.onShowChosen();
    return { selectFeature: vi.fn(), setVisible: vi.fn(), smallsNow: () => [], dispose: vi.fn() };
  },
}));

import { LANDING_WAY_IN, LandingTileStage } from './landing-tile-stage';

class NoObserver {
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  vi.useFakeTimers();
  renderer.showChosen = null;
  renderer.layouts = [];
  vi.stubGlobal('ResizeObserver', NoObserver);
  vi.stubGlobal('IntersectionObserver', NoObserver);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const stage = () => (
  <LandingTileStage scene={0} reduced={false} visible onSelect={vi.fn()} onInteraction={vi.fn()} />
);

it('brings the CTA in with the words, then pulses it; the way in waits for the chosen example', async () => {
  const wayIn = vi.fn();
  window.addEventListener(LANDING_WAY_IN, wayIn);
  await act(async () => {
    render(stage());
  });
  const cta = screen.getByText('Try it now');
  expect(cta).toHaveAttribute('data-cta-state', 'waiting');
  act(() => vi.advanceTimersByTime(250));
  expect(cta).toHaveAttribute('data-cta-state', 'waiting');
  act(() => vi.advanceTimersByTime(100));
  expect(cta).toHaveAttribute('data-cta-state', 'enter');
  act(() => vi.advanceTimersByTime(1650));
  expect(cta).toHaveAttribute('data-cta-state', 'enter');
  act(() => vi.advanceTimersByTime(100));
  expect(cta).toHaveAttribute('data-cta-state', 'alive');
  expect(wayIn).not.toHaveBeenCalled();
  act(() => renderer.showChosen?.());
  expect(wayIn).toHaveBeenCalledTimes(1);
  window.removeEventListener(LANDING_WAY_IN, wayIn);
});

it("starts the CTA in place when the page's first HTML brought it in", async () => {
  const copy = document.createElement('div');
  copy.dataset.landingFirstPaint = '';
  document.body.append(copy);
  await act(async () => {
    render(stage());
  });
  expect(screen.getByText('Try it now')).toHaveAttribute('data-cta-state', 'enter');
  copy.remove();
});

it('shows the CTA immediately for reduced motion', async () => {
  await act(async () => {
    render(
      <LandingTileStage scene={0} reduced visible onSelect={vi.fn()} onInteraction={vi.fn()} />
    );
  });
  expect(screen.getByText('Try it now')).toHaveAttribute('data-cta-state', 'alive');
});

it('rebuilds the artwork layout when a phone rotates across the desktop breakpoint', async () => {
  let width = 1440;
  let resize: () => void = () => {};
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    width,
    height: 900,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: 900,
    toJSON() {},
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
  await act(async () => {
    render(stage());
  });
  expect(renderer.layouts.at(-1)).toBe(false);
  width = 390;
  await act(async () => {
    resize();
  });
  expect(renderer.layouts.at(-1)).toBe(true);
  width = 1440;
  await act(async () => {
    resize();
  });
  expect(renderer.layouts.at(-1)).toBe(false);
  vi.restoreAllMocks();
});

it('uses a measured desktop scale even when the browser accepts CSS trig syntax', async () => {
  vi.stubGlobal('CSS', { supports: () => true });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 1440,
    height: 900,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 1440,
    bottom: 900,
    toJSON() {},
  });
  const { container } = await act(async () => render(stage()));
  const composition = container.querySelector('canvas')?.parentElement;
  expect(composition?.style.getPropertyValue('--stage-scale')).toBe('0.75');
  expect(composition?.style.left).toBe('0px');
  expect(composition?.style.top).toBe('60px');
  vi.restoreAllMocks();
});
