import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useArrowContrast } from './use-arrow-contrast';

import type { CSSProperties } from 'react';

function Preview({ suspended = false }: { suspended?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useArrowContrast(ref, 0, suspended);
  return (
    <div
      ref={ref}
      style={
        {
          '--blue': '#183f8b',
          '--overlay-center-x': '18%',
          '--overlay-center-y': '53%',
          '--overlay-radius-x': '65%',
          '--overlay-radius-y': '76%',
        } as CSSProperties
      }
    >
      <div data-tour-slide="0">
        {/* biome-ignore lint/performance/noImgElement: Native media fixture for contrast sampling. */}
        <img src="/preview.jpg" alt="Platform preview" />
      </div>
      <button type="button" data-tour-arrow>
        Next
      </button>
    </div>
  );
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('carousel arrow contrast', () => {
  it('switches between brand tones as the media changes and suspends sampling offscreen', () => {
    let brightness = 250;
    const readPixels = vi.fn((x: number, y: number) => ({
      data: new Uint8ClampedArray(
        x === 0 && y === 0 ? [24, 63, 139, 255] : [brightness, brightness, brightness, 255]
      ),
    }));
    const context = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      getImageData: readPixels,
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
    } as DOMRect);
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
      pseudo
        ? ({
            backgroundImage: 'radial-gradient(rgb(248, 250, 252) 0%, rgba(248, 250, 252, 0) 100%)',
          } as CSSStyleDeclaration)
        : computedStyle(element)
    );

    const { rerender } = render(<Preview />);
    const arrow = screen.getByRole('button', { name: 'Next' });
    expect(arrow).toHaveAttribute('data-tone', 'dark');
    brightness = 10;
    act(() => vi.advanceTimersByTime(400));
    expect(arrow).toHaveAttribute('data-tone', 'light');

    rerender(<Preview suspended />);
    const reads = readPixels.mock.calls.length;
    act(() => vi.advanceTimersByTime(1200));
    expect(readPixels).toHaveBeenCalledTimes(reads);
  });

  it('retains the CSS fallback if canvas sampling is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<Preview />);
    expect(screen.getByRole('button', { name: 'Next' })).not.toHaveAttribute('data-tone');
  });
});
