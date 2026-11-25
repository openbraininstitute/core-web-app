'use client';

import { useEffect, useRef, useState } from 'react';

import { optimizedMedia } from '@/ui/segments/landing/optimized-media';

import styles from './model-mosaic.module.css';
import labs from './virtual-labs.module.css';

/** The supplied mosaic film, sped up 1.744x to 10 s: one brain, then the grid of models it opens into. */
export function ModelMosaic({ near = true }: { near?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionAllowed(!preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '150px',
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (near && visible && motionAllowed) void video.play().catch(() => {});
    else video.pause();
  }, [near, visible, motionAllowed]);

  return (
    <div ref={host} data-chapter-media className={styles.gallery}>
      <figure className={styles.movie}>
        <video
          ref={videoRef}
          className={labs.blendedVideo}
          src={
            near && visible
              ? optimizedMedia('/images/start/walkthrough/models-mosaic.mp4')
              : undefined
          }
          poster={optimizedMedia('/images/start/walkthrough/models-mosaic.jpg', 'poster')}
          muted
          loop
          playsInline
          preload="none"
          aria-label="Animated mosaic of brain models, including a cortical microcircuit, FlyWire, a reconstructed neuron and MICrONS"
        />
      </figure>
    </div>
  );
}
