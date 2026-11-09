import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('./landing-tile-renderer', () => ({
  createLandingTileRenderer: (
    _canvas: unknown,
    _picks: unknown,
    options: { onReady: () => void }
  ) => {
    options.onReady();
    return { setVisible: vi.fn(), dispose: vi.fn() };
  },
}));

import { LandingTileStage } from './landing-tile-stage';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('matches the export CTA timeline after the artwork becomes ready', async () => {
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
  expect(cta).toHaveAttribute('data-cta-state', 'waiting');
  act(() => vi.advanceTimersByTime(1249));
  expect(cta).toHaveAttribute('data-cta-state', 'waiting');
  act(() => vi.advanceTimersByTime(1));
  expect(cta).toHaveAttribute('data-cta-state', 'enter');
  act(() => vi.advanceTimersByTime(1750));
  expect(cta).toHaveAttribute('data-cta-state', 'alive');
});

it('shows the CTA immediately for reduced motion', async () => {
  await act(async () => {
    render(
      <LandingTileStage scene={0} reduced visible onSelect={vi.fn()} onInteraction={vi.fn()} />
    );
  });
  expect(screen.getByText('Try it now')).toHaveAttribute('data-cta-state', 'alive');
});
