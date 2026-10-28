import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlatformTour from './platform-tour';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('platform tour', () => {
  it('rotates through the requested order and restarts the timer after manual navigation', () => {
    render(<PlatformTour />);
    expect(screen.getByRole('button', { name: 'Show voltages detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    for (const [duration, label] of [
      [8000, 'spikes'],
      [8000, 'l4 field'],
      [12000, 'em mesh'],
      [16000, 'flywire'],
      [4000, 'analysis'],
      [8000, 'ai chat'],
      [8000, 'voltages'],
    ] as const) {
      act(() => vi.advanceTimersByTime(duration));
      expect(screen.getByRole('button', { name: `Show ${label} detail` })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      if (label === 'flywire') {
        expect(
          screen.getByRole('img', { name: /Animated 3D FlyWire Drosophila model/ })
        ).toHaveAttribute('src', '/images/homepage/flywire-3d.webp');
      }
      if (label === 'ai chat') {
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
    fireEvent.click(screen.getByRole('button', { name: 'Show spikes detail' }));
    act(() => vi.advanceTimersByTime(7999));
    expect(
      screen.getByRole('heading', { name: 'Discover patterns in firing.' })
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(
      screen.getByRole('img', { name: /Animated layer 4 extracellular field/ })
    ).toHaveAttribute('src', '/images/homepage/lfp-light-traces.gif');
  });

  it('supports arrow keys and wraps through every detail', () => {
    render(<PlatformTour />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Show voltages detail' }), {
      key: 'ArrowLeft',
    });
    expect(screen.getByRole('button', { name: 'Show ai chat detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Show ai chat detail' }), {
      key: 'ArrowRight',
    });
    expect(screen.getByRole('button', { name: 'Show voltages detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
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
    expect(screen.getByRole('button', { name: 'Show spikes detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent(viewport, pointer('pointerdown', 250, 100));
    fireEvent(viewport, pointer('pointerup', 240, 220));
    expect(screen.getByRole('button', { name: 'Show spikes detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('does not start an automatic tour when reduced motion is requested', () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true });
    render(<PlatformTour />);
    act(() => vi.advanceTimersByTime(24000));
    expect(screen.getByRole('button', { name: 'Show voltages detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show em mesh detail' }));
    expect(
      screen.getByRole('img', { name: /Animated electron microscopy cell mesh/ })
    ).toHaveAttribute('src', '/images/homepage/em-cell-mesh-poster.png');
    fireEvent.click(screen.getByRole('button', { name: 'Show l4 field detail' }));
    expect(
      screen.getByRole('img', { name: /Animated layer 4 extracellular field/ })
    ).toHaveAttribute('src', '/images/homepage/lfp-light-traces-poster.png');
    fireEvent.click(screen.getByRole('button', { name: 'Show flywire detail' }));
    expect(
      screen.getByRole('img', { name: /Animated 3D FlyWire Drosophila model/ })
    ).toHaveAttribute('src', '/images/homepage/flywire-3d-poster.png');
  });

  it('keeps rotating after pointer interaction and wraps from the last slide to the first', () => {
    render(<PlatformTour />);
    fireEvent.mouseEnter(
      screen.getByRole('region', { name: 'Inside Virtual Labs: platform tour' })
    );
    fireEvent.focus(screen.getByRole('button', { name: 'Show voltages detail' }));
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByRole('button', { name: 'Show spikes detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show ai chat detail' }));
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByRole('button', { name: 'Show voltages detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('suspends automatic movement when the browser tab is hidden', () => {
    render(<PlatformTour />);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(24000));
    expect(screen.getByRole('button', { name: 'Show voltages detail' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
