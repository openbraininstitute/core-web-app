import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: ({ fill: _fill, preload: _preload, ...props }: Record<string, unknown>) => (
    // biome-ignore lint/performance/noImgElement: this mocks next/image in component tests.
    <img alt="" {...props} />
  ),
}));

import HexagonHero from './hexagon-hero';

const artwork = { mosaic: '/mosaic.webp', solid: '/solid.webp' };
let visible: (intersecting: boolean) => void;
let media: {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};
let frames: Map<number, FrameRequestCallback>;
let now = 0;
let nextFrame: number;
let disconnect: ReturnType<typeof vi.fn>;

beforeEach(() => {
  frames = new Map();
  now = 0;
  nextFrame = 0;
  disconnect = vi.fn();
  media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => media);
  vi.stubGlobal(
    'Image',
    class {
      src = '';
      naturalWidth = 1672;
      naturalHeight = 941;
      decode = () => Promise.resolve();
    }
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        visible = (isIntersecting) =>
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver
          );
      }
      observe = vi.fn();
      disconnect = disconnect;
    }
  );
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const context = Object.fromEntries(
    [
      'clearRect',
      'drawImage',
      'save',
      'restore',
      'translate',
      'scale',
      'setTransform',
      'beginPath',
      'moveTo',
      'lineTo',
      'closePath',
      'clip',
    ].map((key) => [key, vi.fn()])
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as never);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mount() {
  const result = render(<HexagonHero artwork={artwork} />);
  await act(async () => {
    await Promise.resolve();
  });
  return result;
}

function advance(milliseconds: number) {
  act(() => {
    for (let elapsed = 0; elapsed < milliseconds; elapsed += 20) {
      now += 20;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(now);
    }
  });
}

it('plays automatically, holds the solid artwork for five seconds, then repeats without controls', async () => {
  const { container } = await mount();
  expect(container.querySelector('button')).toBeNull();
  act(() => visible(true));
  advance(5800);
  expect(container.querySelector('canvas')).toHaveAttribute('data-wave-state', 'solid');
  advance(4700);
  expect(container.querySelector('canvas')).toHaveAttribute('data-wave-state', 'solid');
  advance(400);
  expect(container.querySelector('canvas')).toHaveAttribute('data-wave-state', 'wave');
});

it('stops scheduling frames offscreen and releases the observer on unmount', async () => {
  const { unmount } = await mount();
  act(() => visible(true));
  advance(1000);
  expect(frames.size).toBe(1);
  act(() => visible(false));
  expect(frames.size).toBe(0);
  act(() => visible(true));
  advance(1000);
  unmount();
  expect(frames.size).toBe(0);
  expect(disconnect).toHaveBeenCalledOnce();
});

it('uses the solid image without animation for reduced motion', async () => {
  media.matches = true;
  const { container } = await mount();
  act(() => visible(true));
  advance(12000);
  expect(container.querySelector('canvas')).toHaveAttribute('data-wave-state', 'solid');
  expect(frames.size).toBe(0);
});

it('keeps the static artwork available when canvas rendering is unsupported', async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  const { container } = await mount();
  expect(container.querySelector('img')).toHaveAttribute('src', artwork.mosaic);
  expect(container.querySelector('img')).not.toHaveClass('hidden');
  expect(frames.size).toBe(0);
});
