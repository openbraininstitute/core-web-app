'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { useArrowContrast } from './use-arrow-contrast';

import type { KeyboardEvent, PointerEvent } from 'react';

import styles from './platform-tour.module.css';

const INTERVAL = 8000;
const VIDEOS = {
  models: {
    src: '/images/homepage/models-overview.mp4',
    poster: '/images/homepage/models-overview-poster.jpg',
    width: 1440,
    height: 810,
    duration: 14500,
  },
  flywire: {
    src: '/images/homepage/flywire-platform.mp4',
    poster: '/images/homepage/flywire-platform-poster.jpg',
    width: 1440,
    height: 810,
    duration: 4000,
  },
  microcircuit: {
    src: '/images/homepage/small-microcircuit.mp4',
    poster: '/images/homepage/small-microcircuit-poster.jpg',
    width: 1440,
    height: 810,
    duration: 8500,
  },
  education: {
    src: '/images/homepage/education.mp4',
    poster: '/images/homepage/education-poster.jpg',
    width: 1440,
    height: 810,
    duration: 10000,
  },
};
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
  chat: {
    src: '/images/homepage/ai-chat-platform.png',
    width: 2986,
    height: 1868,
  },
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
  title: string;
  titleLines?: readonly string[];
  description: string;
  alt: string;
} & (
  | { kind: 'video'; source: keyof typeof VIDEOS }
  | { kind: 'animation'; source: keyof typeof ANIMATIONS }
  | { kind: 'screenshot'; source: keyof typeof SOURCES }
  | { kind: 'image'; source: keyof typeof SOURCES; crop: { x: number; y: number; width: number } }
);

export const SLIDES: readonly Slide[] = [
  {
    id: 'models',
    kind: 'video',
    source: 'models',
    title: 'Explore brain data. Build models. Run simulations.',
    titleLines: ['Explore brain data.', 'Build models.', 'Run simulations.'],
    description: 'Explore the data, models, and tools available in Virtual Labs.',
    alt: 'Animated overview of brain models expanding into a montage of neuroscience models.',
  },
  {
    id: 'voltages',
    kind: 'image',
    title: 'Follow the electrical response.',
    description: 'Compare membrane voltage traces across recorded neurons.',
    alt: 'Close-up of membrane voltage traces and their time axis in the simulation results.',
    source: 'voltage',
    crop: { x: 15, y: 170, width: 1190 },
  },
  {
    id: 'spikes',
    kind: 'image',
    title: 'Discover patterns in firing.',
    description: 'Inspect when individual neurons spike over the course of a simulation.',
    alt: 'Close-up of the spike raster, showing neuronal firing times and stimulus markers.',
    source: 'spikes',
    crop: { x: 10, y: 170, width: 1190 },
  },
  {
    id: 'lfp',
    title: 'See extracellular fields evolve.',
    description:
      'Watch extracellular field changes alongside the neurons’ synchronized voltage traces.',
    alt: 'Animated layer 4 extracellular field above synchronized neuronal voltage traces and a time axis.',
    kind: 'animation',
    source: 'lfp',
  },
  {
    id: 'em',
    title: 'Skeletonize electron microscopy data.',
    description: 'Turn detailed cell meshes into neuronal skeletons for analysis and modeling.',
    alt: 'Animated electron microscopy cell mesh showing the neuron’s surface and branching structure.',
    kind: 'animation',
    source: 'em',
  },
  {
    id: 'flywire',
    title: 'Explore a Drosophila brain in 3D.',
    description: 'Explore the FlyWire Drosophila model in the platform’s 3D viewer.',
    alt: 'Animated 3D FlyWire Drosophila model in the platform.',
    kind: 'video',
    source: 'flywire',
  },
  {
    id: 'microcircuit',
    kind: 'video',
    source: 'microcircuit',
    title: 'Bring a microcircuit to life.',
    description: 'Run a digital brain circuit and explore its activity in 3D.',
    alt: 'Small microcircuit simulation showing neurons in 3D alongside their spike activity.',
  },
  {
    id: 'analysis',
    kind: 'image',
    title: 'Compare activity across cell types.',
    description: 'Explore distributions of mean membrane voltage for different neuron groups.',
    alt: 'Close-up of colored mean membrane voltage distributions grouped by neuron type.',
    source: 'voltage',
    crop: { x: 1248, y: 750, width: 1210 },
  },
  {
    id: 'education',
    kind: 'video',
    source: 'education',
    title: 'Learn neuroscience by doing.',
    description: 'Explore brain models and simulations through hands-on learning.',
    alt: 'Students exploring neuroscience models and simulations during a classroom workshop.',
  },
  {
    id: 'ai-chat',
    kind: 'screenshot',
    title: 'Use the platform through chat.',
    description:
      'Connect a compatible AI assistant to explore data, run simulations, and analyze results through conversation.',
    alt: 'AI assistant chat connected to the OBI platform alongside generated ion-channel comparison plots.',
    source: 'chat',
  },
];

export default function PlatformTour({
  activeIndex,
  onIndexChange,
  showCaption = true,
}: {
  activeIndex?: number;
  onIndexChange?: (index: number) => void;
  showCaption?: boolean;
} = {}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const index = activeIndex ?? internalIndex;
  const setIndex = onIndexChange ?? setInternalIndex;
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const slide = SLIDES[index];
  const animation = slide.kind === 'animation' ? ANIMATIONS[slide.source] : null;
  const video = slide.kind === 'video' ? VIDEOS[slide.source] : null;
  const suspended = !inView || !pageVisible;
  const playing = !reducedMotion;
  const animate = playing && !suspended;
  const delay = video?.duration ?? animation?.duration ?? INTERVAL;

  useArrowContrast(rootRef, index, suspended);

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
  }, [index, playing, suspended, delay, setIndex]);

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
      aria-describedby={showCaption ? undefined : 'tour-caption'}
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
        {SLIDES.map((item, position) => {
          const active = position === index;
          const animationSource = item.kind === 'animation' ? ANIMATIONS[item.source] : null;
          const videoSource = item.kind === 'video' ? VIDEOS[item.source] : null;
          const imageSource =
            item.kind === 'image' || item.kind === 'screenshot' ? SOURCES[item.source] : null;
          return (
            <div
              key={item.id}
              data-tour-slide={position}
              className={`${styles.layer} ${active ? styles.visible : ''}`}
              aria-hidden={!active}
              inert={!active}
            >
              {videoSource &&
                (active && animate ? (
                  <video
                    className={styles.animation}
                    src={videoSource.src}
                    poster={videoSource.poster}
                    width={videoSource.width}
                    height={videoSource.height}
                    aria-label={item.alt}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                  />
                ) : (
                  <Image
                    src={videoSource.poster}
                    alt={active ? item.alt : ''}
                    width={videoSource.width}
                    height={videoSource.height}
                    unoptimized
                    className={styles.animation}
                    loading="eager"
                  />
                ))}
              {animationSource && (
                <Image
                  src={active && animate ? animationSource.src : animationSource.poster}
                  alt={active ? item.alt : ''}
                  width={animationSource.width}
                  height={animationSource.height}
                  unoptimized
                  className={styles.animation}
                  loading="eager"
                />
              )}
              {imageSource && item.kind === 'screenshot' && (
                <div className={styles.screenshotFrame}>
                  <Image
                    src={imageSource.src}
                    alt={active ? item.alt : ''}
                    width={imageSource.width}
                    height={imageSource.height}
                    className={styles.screenshot}
                    sizes="100vw"
                  />
                  {active && (
                    <a
                      href={imageSource.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.expand}
                    >
                      <span aria-hidden="true">↗</span>
                      <span className="sr-only">View AI chat example at full size</span>
                    </a>
                  )}
                </div>
              )}
              {imageSource && item.kind === 'image' && (
                <Image
                  src={imageSource.src}
                  alt={active ? item.alt : ''}
                  width={imageSource.width}
                  height={imageSource.height}
                  className={styles.image}
                  style={{
                    transform: `scale(${imageSource.width / item.crop.width}) translate(${(-item.crop.x / imageSource.width) * 100}%, ${(-item.crop.y / imageSource.height) * 100}%)`,
                  }}
                  sizes="220vw"
                  loading="eager"
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className={`${styles.arrow} ${styles.previous}`}
        data-tour-arrow
        aria-label="Previous detail"
        onKeyDown={handleKeys}
        onClick={() => selectSlide(index - 1)}
      >
        <span aria-hidden="true">‹</span>
      </button>
      <button
        type="button"
        className={`${styles.arrow} ${styles.next}`}
        data-tour-arrow
        aria-label="Next detail"
        onKeyDown={handleKeys}
        onClick={() => selectSlide(index + 1)}
      >
        <span aria-hidden="true">›</span>
      </button>

      {showCaption && (
        <div className={styles.caption} aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
          <div className={styles.captionTitle}>
            <h2>{slide.title}</h2>
          </div>
          <p>{slide.description}</p>
        </div>
      )}
    </section>
  );
}
