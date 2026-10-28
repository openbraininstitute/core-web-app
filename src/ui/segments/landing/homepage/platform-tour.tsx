'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import type { KeyboardEvent, PointerEvent } from 'react';

import styles from './platform-tour.module.css';

const INTERVAL = 8000;
const ANIMATIONS = {
  em: {
    src: '/images/homepage/em-cell-mesh.webp',
    poster: '/images/homepage/em-cell-mesh-poster.png',
    width: 800,
    height: 450,
    duration: 16000,
  },
  lfp: {
    src: '/images/homepage/lfp-light-traces.gif',
    poster: '/images/homepage/lfp-light-traces-poster.png',
    width: 960,
    height: 540,
    duration: 12000,
  },
};

const SOURCES = {
  voltage: {
    src: '/images/homepage/virtual-lab-voltages.png',
    width: 2548,
    height: 1446,
  },
  spikes: {
    src: '/images/homepage/virtual-lab-analysis.png',
    width: 2546,
    height: 1432,
  },
};

type Slide = {
  id: string;
  label: string;
  title: string;
  description: string;
  alt: string;
} & (
  | { kind: 'animation'; source: keyof typeof ANIMATIONS }
  | { kind: 'image'; source: keyof typeof SOURCES; crop: { x: number; y: number; width: number } }
);

const SLIDES: readonly Slide[] = [
  {
    id: 'voltages',
    kind: 'image',
    label: 'Voltages',
    title: 'Follow the electrical response.',
    description: 'Compare membrane voltage traces across recorded neurons.',
    alt: 'Close-up of membrane voltage traces and their time axis in the simulation results.',
    source: 'voltage',
    crop: { x: 15, y: 170, width: 1190 },
  },
  {
    id: 'spikes',
    kind: 'image',
    label: 'Spikes',
    title: 'Discover patterns in firing.',
    description: 'Inspect when individual neurons spike over the course of a simulation.',
    alt: 'Close-up of the spike raster, showing neuronal firing times and stimulus markers.',
    source: 'spikes',
    crop: { x: 10, y: 170, width: 1190 },
  },
  {
    id: 'lfp',
    label: 'L4 field',
    title: 'See extracellular fields evolve.',
    description:
      'Watch extracellular field changes alongside the neurons’ synchronized voltage traces.',
    alt: 'Animated layer 4 extracellular field above synchronized neuronal voltage traces and a time axis.',
    kind: 'animation',
    source: 'lfp',
  },
  {
    id: 'em',
    label: 'EM mesh',
    title: 'Skeletonize electron microscopy data.',
    description: 'Turn detailed cell meshes into neuronal skeletons for analysis and modeling.',
    alt: 'Animated electron microscopy cell mesh showing the neuron’s surface and branching structure.',
    kind: 'animation',
    source: 'em',
  },
  {
    id: 'analysis',
    kind: 'image',
    label: 'Analysis',
    title: 'Compare activity across cell types.',
    description: 'Explore distributions of mean membrane voltage for different neuron groups.',
    alt: 'Close-up of colored mean membrane voltage distributions grouped by neuron type.',
    source: 'voltage',
    crop: { x: 1248, y: 750, width: 1210 },
  },
];

export default function PlatformTour() {
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const slide = SLIDES[index];
  const isAnimation = slide.kind === 'animation';
  const animation = slide.kind === 'animation' ? ANIMATIONS[slide.source] : null;
  const suspended = !inView || !pageVisible;
  const playing = !reducedMotion;
  const animate = playing && !suspended;
  const delay = animation?.duration ?? INTERVAL;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const respectMotion = () => {
      setReducedMotion(media.matches);
    };
    respectMotion();
    media.addEventListener('change', respectMotion);
    return () => media.removeEventListener('change', respectMotion);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState !== 'hidden');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.2 }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || suspended) return;
    const timer = window.setTimeout(() => setIndex((index + 1) % SLIDES.length), delay);
    return () => window.clearTimeout(timer);
  }, [index, playing, suspended, delay]);

  function selectSlide(next: number) {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }

  function handleKeys(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectSlide(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectSlide(index + 1);
    }
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      selectSlide(index + (deltaX < 0 ? 1 : -1));
    }
  }

  return (
    <section
      ref={rootRef}
      id="preview"
      className={styles.tour}
      aria-label="Inside Virtual Labs: platform tour"
      aria-roledescription="carousel"
    >
      <div
        className={styles.viewport}
        data-testid="tour-viewport"
        onPointerDown={(event) => {
          pointerStart.current =
            event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={finishSwipe}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        {animation && (
          <Image
            key={slide.id}
            src={animate ? animation.src : animation.poster}
            alt={slide.alt}
            width={animation.width}
            height={animation.height}
            unoptimized
            className={styles.animation}
            loading="eager"
          />
        )}
        {Object.entries(SOURCES).map(([key, source]) => {
          const active = slide.kind === 'image' && slide.source === key;
          const defaultSlide = SLIDES.find((item) => item.kind === 'image' && item.source === key);
          if (!defaultSlide || defaultSlide.kind !== 'image') return null;
          const crop = slide.kind === 'image' && active ? slide.crop : defaultSlide.crop;
          const scale = source.width / crop.width;
          return (
            <Image
              key={key}
              src={source.src}
              alt={active ? slide.alt : ''}
              aria-hidden={!active}
              width={source.width}
              height={source.height}
              className={`${styles.image} ${active ? styles.active : ''}`}
              style={{
                transform: `scale(${scale}) translate(${(-crop.x / source.width) * 100}%, ${(-crop.y / source.height) * 100}%)`,
              }}
              sizes="(max-width: 800px) 240vw, 140vw"
              loading="eager"
            />
          );
        })}
        {!isAnimation && <span className={styles.detailBadge}>Detail view</span>}
      </div>

      <div className={styles.caption} aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
        <div className={styles.captionTitle}>
          <h2>{slide.title}</h2>
          <span>
            {index + 1} / {SLIDES.length}
          </span>
        </div>
        <p>{slide.description}</p>
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Previous detail"
          onKeyDown={handleKeys}
          onClick={() => selectSlide(index - 1)}
        >
          <span aria-hidden="true">←</span>
        </button>
        <fieldset className={styles.sceneButtons} aria-label="Choose a platform detail">
          {SLIDES.map((item, position) => (
            <button
              key={item.id}
              type="button"
              className={styles.sceneButton}
              aria-label={`Show ${item.label.toLowerCase()} detail`}
              aria-pressed={index === position}
              onClick={() => selectSlide(position)}
              onKeyDown={handleKeys}
            >
              {item.label}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Next detail"
          onKeyDown={handleKeys}
          onClick={() => selectSlide(index + 1)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
