import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlatformTour from './platform-tour';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function expectAction(name: string) {
  const actions = screen.getAllByTestId('tour-platform-action');
  expect(actions).toHaveLength(1);
  expect(actions[0]).toHaveAccessibleName(name);
  expect(actions[0]).toHaveAttribute('href', '/app/virtual-lab/sync');
}

function next(times = 1) {
  for (let count = 0; count < times; count += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Next detail' }));
  }
}

describe('platform tour', () => {
  it('rotates through contextual platform actions and restarts the timer after manual navigation', () => {
    render(<PlatformTour />);
    expectAction('Try a voltage simulation');
    expect(
      screen.queryByRole('group', { name: 'Choose a platform detail' })
    ).not.toBeInTheDocument();
    for (const [duration, action] of [
      [8000, 'Explore spike activity'],
      [8000, 'Explore extracellular fields'],
      [12000, 'Skeletonize EM data'],
      [16000, 'Try the FlyWire model'],
      [4000, 'Analyze simulation results'],
      [8000, 'Try the platform through chat'],
      [8000, 'Try a voltage simulation'],
    ] as const) {
      act(() => vi.advanceTimersByTime(duration));
      expectAction(action);
      if (action === 'Try the FlyWire model') {
        expect(
          screen.getByRole('img', { name: /Animated 3D FlyWire Drosophila model/ })
        ).toHaveAttribute('src', '/images/homepage/flywire-3d.webp');
      }
      if (action === 'Try the platform through chat') {
        expect(
          screen.getByRole('heading', { name: 'Use the platform through chat.' })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('img', { name: /AI assistant chat connected to the OBI platform/ })
        ).toHaveAttribute('src', expect.stringContaining('ai-chat-platform.png'));
        expect(
          screen.getByRole('link', { name: 'View AI chat example at full size' })
        ).toHaveAttribute('href', '/images/homepage/ai-chat-platform.png');
      }
    }
    next();
    act(() => vi.advanceTimersByTime(7999));
    expectAction('Explore spike activity');
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole('img', { name: /Animated layer 4 extracellular field/ })
    ).toHaveAttribute('src', '/images/homepage/lfp-light-traces.gif');
    expectAction('Explore extracellular fields');
  });

  it('supports arrow keys and wraps through every detail', () => {
    render(<PlatformTour />);
    fireEvent.keyDown(screen.getByTestId('tour-platform-action'), { key: 'ArrowLeft' });
    expectAction('Try the platform through chat');
    fireEvent.keyDown(screen.getByRole('button', { name: 'Next detail' }), { key: 'ArrowRight' });
    expectAction('Try a voltage simulation');
  });

  it('swipes between details without turning vertical scrolling into navigation', () => {
    render(<PlatformTour />);
    const viewport = screen.getByTestId('tour-viewport');
    const pointer = (type: string, x: number, y: number) =>
      Object.assign(new Event(type, { bubbles: true }), {
        clientX: x,
        clientY: y,
        pointerType: 'touch',
      });
    fireEvent(viewport, pointer('pointerdown', 250, 100));
    fireEvent(viewport, pointer('pointerup', 150, 105));
    expectAction('Explore spike activity');
    fireEvent(viewport, pointer('pointerdown', 250, 100));
    fireEvent(viewport, pointer('pointerup', 240, 220));
    expectAction('Explore spike activity');
  });

  it('does not start an automatic tour when reduced motion is requested', () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true });
    render(<PlatformTour />);
    act(() => vi.advanceTimersByTime(24000));
    expectAction('Try a voltage simulation');
    next(3);
    expect(
      screen.getByRole('img', { name: /Animated electron microscopy cell mesh/ })
    ).toHaveAttribute('src', '/images/homepage/em-cell-mesh-poster.png');
    fireEvent.click(screen.getByRole('button', { name: 'Previous detail' }));
    expect(
      screen.getByRole('img', { name: /Animated layer 4 extracellular field/ })
    ).toHaveAttribute('src', '/images/homepage/lfp-light-traces-poster.png');
    next(2);
    expect(
      screen.getByRole('img', { name: /Animated 3D FlyWire Drosophila model/ })
    ).toHaveAttribute('src', '/images/homepage/flywire-3d-poster.png');
    expectAction('Try the FlyWire model');
  });

  it('keeps rotating after pointer interaction and wraps from the last slide to the first', () => {
    render(<PlatformTour />);
    fireEvent.mouseEnter(
      screen.getByRole('region', { name: 'Inside Virtual Labs: platform tour' })
    );
    fireEvent.focus(screen.getByTestId('tour-platform-action'));
    act(() => vi.advanceTimersByTime(8000));
    expectAction('Explore spike activity');
    fireEvent.click(screen.getByRole('button', { name: 'Previous detail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous detail' }));
    expectAction('Try the platform through chat');
    act(() => vi.advanceTimersByTime(8000));
    expectAction('Try a voltage simulation');
  });

  it('suspends automatic movement when the browser tab is hidden', () => {
    render(<PlatformTour />);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(24000));
    expectAction('Try a voltage simulation');
  });
});
