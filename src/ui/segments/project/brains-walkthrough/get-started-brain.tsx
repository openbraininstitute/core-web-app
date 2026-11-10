'use client';

import { useEffect, useRef } from 'react';

import styles from './get-started.module.css';

/**
 * A mosaic of the tour's own films, nine moving at once: Virtual Labs, an EM neuron, a simulation set up, a
 * morphology, the models, the Allen V1 circuit, a notebook, simulation results and a class. 10 s.
 */
export function GetStartedBrain({ near = true }: { near?: boolean }) {
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
    <div data-chapter-media className={styles.brainArtwork}>
      <video
        ref={videoRef}
        src={near ? '/images/start/walkthrough/get-started-mosaic.mp4' : undefined}
        poster="/images/start/walkthrough/get-started-mosaic.jpg"
        muted
        loop
        playsInline
        preload="metadata"
        className={styles.mosaicVideo}
        aria-label="A mosaic of the platform: virtual labs, neurons, circuits, simulations, notebooks and teaching"
      />
    </div>
  );
}
