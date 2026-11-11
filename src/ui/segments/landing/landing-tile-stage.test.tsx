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

it('brings the CTA in once the chosen example shows, then pulses it', async () => {
  const wayIn = vi.fn();
  window.addEventListener(LANDING_WAY_IN, wayIn);
  await act(async () => {
    render(
      <LandingTileStage
        scene={0}
        reduced={false}
        visible
        onSelect={vi.fn()}
        onInteraction={vi.fn()}
      />
    );
  });
  const cta = screen.getByText('Try it now');
  act(() => vi.advanceTimersByTime(5000));
  expect(cta).toHaveAttribute('data-cta-state', 'waiting');
  expect(wayIn).not.toHaveBeenCalled();
  act(() => renderer.showChosen?.());
  act(() => vi.advanceTimersByTime(0));
  expect(cta).toHaveAttribute('data-cta-state', 'enter');
  expect(wayIn).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(1749));
  expect(cta).toHaveAttribute('data-cta-state', 'enter');
  act(() => vi.advanceTimersByTime(1));
  expect(cta).toHaveAttribute('data-cta-state', 'alive');
  window.removeEventListener(LANDING_WAY_IN, wayIn);
});

it('shows the CTA immediately for reduced motion', async () => {
  await act(async () => {
    render(
      <LandingTileStage scene={0} reduced visible onSelect={vi.fn()} onInteraction={vi.fn()} />
    );
  });
  expect(screen.getByText('Try it now')).toHaveAttribute('data-cta-state', 'alive');
});
