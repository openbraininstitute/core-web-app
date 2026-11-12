import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const renderer = vi.hoisted(() => ({ showChosen: null as null | (() => void) }));

vi.mock('./landing-tile-renderer', () => ({
  createLandingTileRenderer: (
    _canvas: unknown,
    _picks: unknown,
    options: { reduced: boolean; onReady: () => void; onShowChosen: () => void }
  ) => {
    options.onReady();
    renderer.showChosen = options.onShowChosen;
    // with reduced motion the renderer shows the chosen example at once
    if (options.reduced) options.onShowChosen();
    return { setVisible: vi.fn(), smallsNow: () => [], dispose: vi.fn() };
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
