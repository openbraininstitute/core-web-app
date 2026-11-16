import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useChapterPlayback } from './use-chapter-playback';

let hidden = false;
let reduced = false;
let host: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  reduced = false;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    hidden ? 'hidden' : 'visible'
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (
    this: HTMLMediaElement
  ) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false });
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (
    this: HTMLMediaElement
  ) {
    const wasPlaying = !this.paused;
    Object.defineProperty(this, 'paused', { configurable: true, value: true });
    if (wasPlaying) this.dispatchEvent(new Event('pause'));
  });
  host = document.createElement('div');
  document.body.append(host);
});
afterEach(() => {
  cleanup();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('chapter playback', () => {
  it('tracks video progress, plays once and advances exactly once at its end', () => {
    const layer = document.createElement('div');
    layer.dataset.stageCurrent = 'true';
    const video = document.createElement('video');
    video.loop = true;
    layer.append(video);
    host.append(layer);
    Object.defineProperty(video, 'duration', { value: 20 });
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result, unmount } = renderHook(() =>
      useChapterPlayback({ stage, chapterId: 'labs', enabled: true, onComplete })
    );
    expect(video.loop).toBe(false);
    expect(result.current.playing).toBe(true);
    video.currentTime = 10;
    fireEvent.timeUpdate(video);
    expect(result.current.progress).toBe(0.5);
    fireEvent.ended(video);
    fireEvent.ended(video);
    expect(onComplete).toHaveBeenCalledTimes(1);
    unmount();
    expect(video.loop).toBe(true);
  });

  it('gives model chapters a viewing interval and pauses it when the tab is hidden', () => {
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result } = renderHook(() =>
      useChapterPlayback({ stage, chapterId: 'models', enabled: true, onComplete })
    );
    act(() => vi.advanceTimersByTime(12000));
    expect(result.current.progress).toBe(0.5);
    hidden = true;
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(30000));
    expect(result.current.progress).toBe(0.5);
    expect(onComplete).not.toHaveBeenCalled();
    hidden = false;
    fireEvent(document, new Event('visibilitychange'));
    act(() => vi.advanceTimersByTime(12000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('restarts an ended video when returning to its chapter instead of advancing forward again', () => {
    const layer = document.createElement('div');
    layer.dataset.stageCurrent = 'true';
    const video = document.createElement('video');
    Object.defineProperty(video, 'duration', { value: 20 });
    Object.defineProperty(video, 'ended', { get: () => video.currentTime >= 20 });
    layer.append(video);
    host.append(layer);
    const stage = { current: host };
    const onComplete = vi.fn();
    const { rerender } = renderHook(
      ({ chapterId }) => useChapterPlayback({ stage, chapterId, enabled: true, onComplete }),
      { initialProps: { chapterId: 'labs' } }
    );
    video.currentTime = 20;
    fireEvent.ended(video);
    expect(onComplete).toHaveBeenCalledTimes(1);

    layer.dataset.stageCurrent = 'false';
    rerender({ chapterId: 'models' });
    layer.dataset.stageCurrent = 'true';
    rerender({ chapterId: 'labs' });
    expect(video.currentTime).toBe(0);
    expect(video.play).toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(onComplete).toHaveBeenCalledTimes(1);
    video.currentTime = 20;
    fireEvent.ended(video);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });

  it('supports explicit pause and resume', () => {
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result } = renderHook(() =>
      useChapterPlayback({ stage, chapterId: 'models', enabled: true, onComplete })
    );
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(30000));
    expect(result.current.progress).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(24000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not automatically progress for reduced motion or before the opening is left', () => {
    reduced = true;
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result, rerender } = renderHook(
      ({ enabled }) => useChapterPlayback({ stage, chapterId: 'models', enabled, onComplete }),
      { initialProps: { enabled: true } }
    );
    act(() => vi.advanceTimersByTime(30000));
    expect(result.current.progress).toBe(0);
    rerender({ enabled: false });
    act(() => vi.advanceTimersByTime(30000));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('stays held across chapters once the visitor takes over, until play is pressed', () => {
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result, rerender } = renderHook(
      ({ chapterId }) => useChapterPlayback({ stage, chapterId, enabled: true, onComplete }),
      { initialProps: { chapterId: 'models' } }
    );
    act(() => vi.advanceTimersByTime(6000));
    act(() => result.current.hold());
    expect(result.current.playing).toBe(false);
    rerender({ chapterId: 'notebooks' });
    act(() => vi.advanceTimersByTime(30000));
    expect(result.current.playing).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
    act(() => result.current.toggle());
    act(() => vi.advanceTimersByTime(24000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps videos playing once the visitor takes over, only no longer moving on', () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);
    const addVideo = () => {
      host.replaceChildren();
      const layer = document.createElement('div');
      layer.dataset.stageCurrent = 'true';
      const video = document.createElement('video');
      video.loop = true;
      Object.defineProperty(video, 'duration', { value: 20 });
      layer.append(video);
      host.append(layer);
      return video;
    };
    const first = addVideo();
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result, rerender } = renderHook(
      ({ chapterId }) => useChapterPlayback({ stage, chapterId, enabled: true, onComplete }),
      { initialProps: { chapterId: 'labs' } }
    );
    pause.mockClear();
    act(() => result.current.hold());
    expect(pause.mock.calls.length).toBe(0);
    // It loops in place rather than ending into the next screen.
    expect(first.loop).toBe(true);
    expect(result.current.playing).toBe(true);
    first.currentTime = 10;
    fireEvent.timeUpdate(first);
    expect(result.current.progress).toBe(0.5);
    const next = addVideo();
    play.mockClear();
    rerender({ chapterId: 'notebooks' });
    expect(play.mock.calls.length).toBeGreaterThan(0);
    expect(next.loop).toBe(true);
    fireEvent.ended(next);
    expect(onComplete).not.toHaveBeenCalled();
    // The displayed Pause action pauses the playing film even when the tour is held.
    expect(result.current.playing).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
    expect(next.paused).toBe(true);
    // Play resumes the tour from the screen on: this video now ends into the next one.
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);
    expect(next.loop).toBe(false);
    fireEvent.ended(next);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('pauses the video on screen only from the pause button', () => {
    const layer = document.createElement('div');
    layer.dataset.stageCurrent = 'true';
    const video = document.createElement('video');
    layer.append(video);
    host.append(layer);
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result } = renderHook(() =>
      useChapterPlayback({ stage, chapterId: 'labs', enabled: true, onComplete })
    );
    pause.mockClear();
    act(() => result.current.toggle());
    expect(pause.mock.calls.length).toBe(1);
  });

  it('holds the viewing interval while a mouse is over the current scene', () => {
    const layer = document.createElement('div');
    layer.dataset.stageCurrent = 'true';
    const model = document.createElement('canvas');
    layer.append(model);
    host.append(layer);
    const onComplete = vi.fn();
    const stage = { current: host };
    const { result } = renderHook(() =>
      useChapterPlayback({ stage, chapterId: 'models', enabled: true, onComplete })
    );
    act(() => vi.advanceTimersByTime(12000));
    fireEvent.pointerMove(model, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(60000));
    expect(result.current.progress).toBe(0.5);
    expect(result.current.playing).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.pointerLeave(host);
    act(() => vi.advanceTimersByTime(12000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
