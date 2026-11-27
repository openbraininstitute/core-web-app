import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { GetStartedBrain } from './get-started-brain';

let intersect: IntersectionObserverCallback;
const disconnect = vi.fn();
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersect = callback;
      }
      observe() {}
      disconnect = disconnect;
    }
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  disconnect.mockClear();
});

it('keeps globe downloads offscreen, selects a mobile source when active and stops on exit', () => {
  const { container, rerender, unmount } = render(<GetStartedBrain near={false} />);
  const video = container.querySelector('video') as HTMLVideoElement;
  expect(video.querySelector('source')).toBeNull();
  expect(video.preload).toBe('none');
  rerender(<GetStartedBrain near />);
  expect(video.querySelector('source[media]')?.getAttribute('src')).toContain('globe-mobile-');
  expect(video.poster).toContain('globe-poster-');
  expect(video.load).toHaveBeenCalledOnce();
  expect(video.play).not.toHaveBeenCalled();
  intersect([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  expect(video.play).toHaveBeenCalledOnce();
  unmount();
  expect(video.pause).toHaveBeenCalled();
  expect(disconnect).toHaveBeenCalledOnce();
});
