'use client';

import { useEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

export interface ChapterPlayback {
  progress: number;
  playing: boolean;
  toggle: () => void;
}

/** Videos finish once; chapters made of interactive models get a timed viewing interval. */
export function useChapterPlayback({
  stage,
  chapterId,
  enabled,
  onComplete,
  duration = 24000,
}: {
  stage: RefObject<HTMLDivElement | null>;
  chapterId: string;
  enabled: boolean;
  onComplete: () => void;
  duration?: number;
}): ChapterPlayback {
  const [state, setState] = useState({ id: chapterId, progress: 0, playing: false });
  const toggle = useRef(() => {});

  useEffect(() => {
    if (!enabled) return;
    const host = stage.current;
    if (!host) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = document.visibilityState !== 'hidden';
    let paused = false;
    let completed = false;
    let elapsed = 0;
    let last = Date.now();
    let video: HTMLVideoElement | null = null;
    let detachVideo = () => {};
    const publish = (progress: number, playing: boolean) =>
      setState({ id: chapterId, progress, playing });
    const complete = () => {
      if (completed || !visible || preference.matches || paused) return;
      completed = true;
      publish(1, false);
      onComplete();
    };
    const update = () => {
      const now = Date.now();
      const running = visible && !preference.matches && !paused && !completed;
      if (video) {
        const progress =
          Number.isFinite(video.duration) && video.duration > 0
            ? video.currentTime / video.duration
            : 0;
        publish(Math.min(1, progress), running && !video.paused);
        if (video.ended) complete();
      } else {
        if (running) elapsed += now - last;
        publish(Math.min(1, elapsed / duration), running);
        if (elapsed >= duration) complete();
      }
      last = now;
    };
    const bind = () => {
      const candidate = host.querySelector<HTMLVideoElement>('[data-stage-current="true"] video');
      if (candidate === video) return;
      detachVideo();
      video = candidate;
      if (!candidate) return;
      elapsed = 0;
      const originalLoop = candidate.loop;
      candidate.loop = false;
      const play = () => {
        paused = false;
        update();
      };
      const pause = () => {
        if (visible && !preference.matches && !candidate.ended) paused = true;
        update();
      };
      candidate.addEventListener('timeupdate', update);
      candidate.addEventListener('ended', complete);
      candidate.addEventListener('play', play);
      candidate.addEventListener('pause', pause);
      if (paused || !visible || preference.matches) candidate.pause();
      detachVideo = () => {
        candidate.removeEventListener('timeupdate', update);
        candidate.removeEventListener('ended', complete);
        candidate.removeEventListener('play', play);
        candidate.removeEventListener('pause', pause);
        candidate.loop = originalLoop;
      };
      update();
    };
    const visibility = () => {
      visible = document.visibilityState !== 'hidden';
      last = Date.now();
      if (!visible || preference.matches) video?.pause();
      else if (!paused && video && !video.ended) void video.play().catch(() => {});
      update();
    };
    toggle.current = () => {
      if (video) {
        if (video.paused) {
          paused = false;
          void video.play().catch(() => {});
        } else {
          paused = true;
          video.pause();
        }
      } else paused = !paused;
      last = Date.now();
      update();
    };
    bind();
    publish(0, visible && !preference.matches);
    const observer = new MutationObserver(bind);
    observer.observe(host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-stage-current', 'src'],
    });
    const timer = window.setInterval(update, 100);
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', visibility);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      detachVideo();
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', visibility);
      toggle.current = () => {};
    };
  }, [chapterId, enabled, stage, onComplete, duration]);

  return {
    progress: state.id === chapterId ? state.progress : 0,
    playing: enabled && state.id === chapterId && state.playing,
    toggle: () => toggle.current(),
  };
}
