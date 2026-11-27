'use client';

import { useEffect, useRef } from 'react';

import { optimizedMedia } from '@/ui/segments/landing/optimized-media';

import styles from './get-started.module.css';

/** The latest platform overview mosaic, supplied for the closing chapter. */
export function GetStartedBrain({ near = true }: { near?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let visible = false;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (visible && !document.hidden && !preference.matches) void video.play().catch(() => {});
      else {
        video.pause();
        // Off screen it waits at its (white) start, so coming back never shows the globe it was left on.
        if (!visible && video.currentTime > 0) video.currentTime = 0;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(video);
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      video.pause();
      observer.disconnect();
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return (
    <div data-chapter-media className={styles.brainArtwork}>
      <video
        ref={videoRef}
        src={near ? optimizedMedia('/images/start/walkthrough/get-started-mosaic.mp4') : undefined}
        poster={optimizedMedia('/images/start/walkthrough/get-started-mosaic.jpg', 'poster')}
        muted
        loop
        playsInline
        preload="metadata"
        className={styles.mosaicVideo}
        aria-label="An animated mosaic of platform workflows, brain models, simulation results and teaching"
      />
    </div>
  );
}
