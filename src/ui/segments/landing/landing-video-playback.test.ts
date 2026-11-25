import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createLandingPlayback } from './landing-video-playback';

const models = [
  { preview: '/one-preview.mp4', video: '/one-full.mp4' },
  { preview: '/two-preview.mp4', video: '/two-full.mp4' },
];
let created: HTMLVideoElement[];
let idle: IdleRequestCallback;
beforeEach(() => {
  created = [];
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn((callback) => {
      idle = callback;
      return 1;
    })
  );
  vi.stubGlobal('cancelIdleCallback', vi.fn());
  const original = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
    const element = original(tag, options);
    if (tag === 'video') {
      const video = element as HTMLVideoElement;
      video.play = vi.fn().mockResolvedValue(undefined);
      video.pause = vi.fn();
      video.load = vi.fn();
      created.push(video);
    }
    return element;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const becomeIdle = () => idle({ didTimeout: false, timeRemaining: () => 10 });

it('does not even create a decoder or assign media before idle', () => {
  const playback = createLandingPlayback(models, vi.fn());
  expect(playback.update(0, true)).toBeNull();
  expect(created).toHaveLength(0);
  becomeIdle();
  expect(playback.update(0, true)?.getAttribute('src')).toBe('/one-preview.mp4');
  playback.dispose();
});

it('releases the preceding download before starting the next, and upgrades a manual selection', () => {
  const playback = createLandingPlayback(models, vi.fn());
  becomeIdle();
  const first = playback.update(0, true)!;
  const second = playback.update(1, true)!;
  expect(first.getAttribute('src')).toBeNull();
  expect(first.pause).toHaveBeenCalled();
  expect(first.load).toHaveBeenCalled();
  expect(playback.get(0)).toBeNull();
  expect(second.getAttribute('src')).toBe('/two-preview.mp4');
  expect(playback.update(1, true, true)?.getAttribute('src')).toBe('/two-full.mp4');
  expect(second.getAttribute('src')).toBeNull();
  expect(created.filter((v) => v.hasAttribute('src'))).toHaveLength(1);
  playback.dispose();
});

it('stops downloads offscreen and cancels pending startup when disposed', () => {
  const ready = vi.fn();
  const playback = createLandingPlayback(models, ready);
  becomeIdle();
  const video = playback.update(0, true)!;
  playback.update(0, false);
  expect(video.getAttribute('src')).toBeNull();
  playback.dispose();
  ready.mockClear();
  becomeIdle();
  expect(ready).not.toHaveBeenCalled();
  expect(playback.update(0, true)).toBeNull();
  expect(window.cancelIdleCallback).toHaveBeenCalled();
});
