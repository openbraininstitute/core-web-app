'use client';

import { useEffect, useRef } from 'react';

import styles from './get-started.module.css';

/** The production homepage film with soft edges fading into the white page. */
export function GetStartedBrain() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let visible = false;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      if (visible && !document.hidden && !preference.matches) void video.play().catch(() => {});
      else video.pause();
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
    <div className={styles.brainArtwork}>
      <video
        ref={videoRef}
        src="/video/get-started-brain.mp4"
        poster="/video/get-started-brain.jpg"
        muted
        loop
        playsInline
        preload="metadata"
        className={styles.brainVideo}
        aria-label="Open Brain Institute homepage brain animation"
      />
    </div>
  );
}
