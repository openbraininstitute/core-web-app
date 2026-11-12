'use client';

import { useEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';

export interface ChapterPlayback {
  progress: number;
  playing: boolean;
  toggle: () => void;
  /** The visitor took over (scrolled, swiped, picked a chapter): stop moving on until they press play. */
  hold: () => void;
}

/**
 * Videos finish once; chapters made of interactive models get a timed viewing interval, which stands
 * still while a mouse is over the scene, so a model being turned is never swept away. Once the visitor
 * takes over (`hold`) or presses pause, the tour stops moving on, across chapters, until they press play;
 * only the pause button stops the video on screen, and every chapter's video still plays, looping.
 */
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
  const holdCurrent = useRef(() => {});
  // Outlives a chapter: once the visitor takes over, the tour no longer moves on by itself.
  const held = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const host = stage.current;
    if (!host) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = document.visibilityState !== 'hidden';
    // The current chapter's video, stopped by the pause button.
    let paused = false;
    let hovering = false;
    let completed = false;
    let elapsed = 0;
    let last = Date.now();
    let video: HTMLVideoElement | null = null;
    let videoLoops = false;
    let detachVideo = () => {};
    const publish = (progress: number, playing: boolean) =>
      setState({ id: chapterId, progress, playing });
    const complete = () => {
      if (completed || !visible || preference.matches || paused || held.current) return;
      completed = true;
      publish(1, false);
      onComplete();
    };
    const update = () => {
      const now = Date.now();
      const running = visible && !preference.matches && !paused && !completed && !held.current;
      if (video) {
        // Manual navigation holds the tour, not the film: controls still reflect actual playback.
        const progress =
          Number.isFinite(video.duration) && video.duration > 0
            ? video.currentTime / video.duration
            : 0;
        publish(Math.min(1, progress), visible && !video.paused && !video.ended);
        if (video.ended) complete();
      } else {
        if (running && !hovering) elapsed += now - last;
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
      videoLoops = originalLoop;
      // It ends, to move on, only while the tour plays by itself.
      candidate.loop = held.current ? originalLoop : false;
      // A neighbouring scene stays mounted while scrolling. Re-entering an ended video must
      // start a fresh viewing, rather than immediately sending the visitor forward again.
      candidate.currentTime = 0;
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
      else void candidate.play().catch(() => {});
      detachVideo = () => {
        candidate.removeEventListener('timeupdate', update);
        candidate.removeEventListener('ended', complete);
        candidate.removeEventListener('play', play);
        candidate.removeEventListener('pause', pause);
        candidate.loop = originalLoop;
        candidate.pause();
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
      const resume = video ? video.paused || video.ended : held.current || paused;
      if (resume) {
        held.current = false;
        paused = false;
        if (video) {
          video.loop = false;
          void video.play().catch(() => {});
        }
      } else {
        held.current = true;
        paused = true;
        if (video) {
          video.loop = videoLoops;
          video.pause();
        }
      }
      last = Date.now();
      update();
    };
    holdCurrent.current = () => {
      if (video) video.loop = videoLoops;
      update();
    };
    const pointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      hovering =
        event.target instanceof Element && !!event.target.closest('[data-stage-current="true"]');
    };
    const pointerLeave = () => {
      hovering = false;
    };
    host.addEventListener('pointermove', pointerMove, { passive: true });
    host.addEventListener('pointerleave', pointerLeave);
    bind();
    update();
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
      host.removeEventListener('pointermove', pointerMove);
      host.removeEventListener('pointerleave', pointerLeave);
      toggle.current = () => {};
      holdCurrent.current = () => {};
    };
  }, [chapterId, enabled, stage, onComplete, duration]);

  return {
    progress: state.id === chapterId ? state.progress : 0,
    playing: enabled && state.id === chapterId && state.playing,
    toggle: () => toggle.current(),
    hold: () => {
      held.current = true;
      holdCurrent.current();
    },
  };
}
