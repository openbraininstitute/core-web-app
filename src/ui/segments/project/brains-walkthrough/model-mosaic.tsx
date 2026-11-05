'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './model-mosaic.module.css';
import labs from './virtual-labs.module.css';

/** The supplied mosaic film, with additional models tracked into its moving grid. */
export function ModelMosaic() {
  const host = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [playing, setPlaying] = useState(false);

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
    if (visible && motionAllowed) void video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [visible, motionAllowed]);

  return (
    <div ref={host} className={styles.gallery}>
      <figure className={styles.movie}>
        <video
          ref={videoRef}
          className={labs.blendedVideo}
          src={visible ? '/images/start/walkthrough/models-mosaic.mp4' : undefined}
          poster="/images/start/walkthrough/models-mosaic.jpg"
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Animated mosaic of brain models, including a cortical microcircuit, FlyWire, a reconstructed neuron and MICrONS"
        />
        <figcaption className={styles.controls}>
          <span>Models across species and scales</span>
          <button
            type="button"
            onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              if (video.paused) void video.play().catch(() => setPlaying(false));
              else video.pause();
            }}
          >
            {playing ? 'Pause movie' : 'Play movie'}
          </button>
        </figcaption>
      </figure>
    </div>
  );
}
