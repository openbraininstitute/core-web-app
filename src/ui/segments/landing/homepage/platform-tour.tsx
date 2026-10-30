'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';

import styles from './platform-tour.module.css';

const INTERVAL = 12000;
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
  label: string;
  title: string;
  titleLines?: readonly string[];
  description: string;
  alt: string;
} & (
  | { kind: 'video'; source: keyof typeof VIDEOS }
  | { kind: 'placeholder'; poster: string }
  | { kind: 'animation'; source: keyof typeof ANIMATIONS }
  | { kind: 'screenshot'; source: keyof typeof SOURCES }
  | { kind: 'image'; source: keyof typeof SOURCES; crop: { x: number; y: number; width: number } }
);

export const SLIDES: readonly Slide[] = [
  {
    id: 'models',
    kind: 'video',
    source: 'models',
    label: 'Models overview',
    title: 'Explore data. Build models. Run simulations.',
    titleLines: ['Explore data.', 'Build models.', 'Run simulations.'],
    description: '',
    alt: 'Animated overview of brain models expanding into a montage of neuroscience models.',
  },
  {
    id: 'voltages',
    kind: 'image',
    label: 'Voltage traces',
    title: 'Follow the electrical response.',
    titleLines: ['Follow the electrical', 'response.'],
    description: 'Compare responses across recorded neurons.',
    alt: 'Close-up of membrane voltage traces and their time axis in the simulation results.',
    source: 'voltage',
    crop: { x: 15, y: 170, width: 1190 },
  },
  {
    id: 'spikes',
    kind: 'image',
    label: 'Spike activity',
    title: 'Discover patterns in firing.',
    titleLines: ['Discover patterns', 'in firing.'],
    description: 'Inspect when neurons fire during a simulation.',
    alt: 'Close-up of the spike raster, showing neuronal firing times and stimulus markers.',
    source: 'spikes',
    crop: { x: 10, y: 170, width: 1190 },
  },
  {
    id: 'lfp',
    label: 'Extracellular fields',
    title: 'See extracellular fields evolve.',
    titleLines: ['See extracellular', 'fields evolve.'],
    description: 'Connect neuronal geometry with electrical activity.',
    alt: 'Animated layer 4 extracellular field above synchronized neuronal voltage traces and a time axis.',
    kind: 'animation',
    source: 'lfp',
  },
  {
    id: 'em',
    label: 'Skeletonize EM meshes',
    title: 'Turn EM meshes into neuronal skeletons.',
    titleLines: ['Turn EM meshes', 'into neuronal skeletons.'],
    description: 'Inspect detailed cell meshes and discover skeletonization tools.',
    alt: 'Animated electron microscopy cell mesh showing the neuron’s surface and branching structure.',
    kind: 'animation',
    source: 'em',
  },
  {
    id: 'flywire',
    label: 'Import models',
    title: 'Bring your models into Virtual Labs.',
    titleLines: ['Bring your models', 'into Virtual Labs.'],
    description: 'Bring published or your own models into the platform.',
    alt: 'Animated 3D FlyWire Drosophila model in the platform.',
    kind: 'video',
    source: 'flywire',
  },
  {
    id: 'microcircuit',
    kind: 'video',
    source: 'microcircuit',
    label: 'Microcircuits',
    title: 'Build a circuit. Run an experiment.',
    titleLines: ['Build a circuit.', 'Run an experiment.'],
    description: 'Investigate how a digital circuit responds to stimulation.',
    alt: 'Small microcircuit simulation showing neurons in 3D alongside their spike activity.',
  },
  {
    id: 'analysis',
    kind: 'image',
    label: 'Activity analysis',
    title: 'Compare activity across cell types.',
    titleLines: ['Compare activity', 'across cell types.'],
    description: 'Explore distributions of mean membrane voltage.',
    alt: 'Close-up of colored mean membrane voltage distributions grouped by neuron type.',
    source: 'voltage',
    crop: { x: 1248, y: 750, width: 1210 },
  },
  {
    id: 'notebooks',
    kind: 'placeholder',
    poster: VIDEOS.models.poster,
    label: 'Notebooks',
    title: 'Run your own analyses.',
    titleLines: ['Run your own', 'analyses.'],
    description: 'Use interactive notebooks to analyze data and models.',
    alt: '',
  },
  {
    id: 'education',
    kind: 'video',
    source: 'education',
    label: 'Teaching',
    title: 'Teach neuroscience by doing.',
    titleLines: ['Teach neuroscience', 'by doing.'],
    description: 'Connect courses to Moodle and discover OBI Summer Camps.',
    alt: 'Students exploring neuroscience models and simulations during a classroom workshop.',
  },
  {
    id: 'ai-chat',
    kind: 'screenshot',
    label: 'AI chat',
    title: 'Work through conversation.',
    titleLines: ['Work through', 'conversation.'],
    description: 'Explore data and workflows with a compatible AI assistant.',
    alt: 'AI assistant chat connected to the OBI platform alongside generated ion-channel comparison plots.',
    source: 'chat',
  },
];

type Chapter = {
  id: string;
  label: string;
  examples: readonly string[];
  featured: string;
  description?: string;
};

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'explore',
    label: 'Explore',
    examples: ['models'],
    featured: 'models',
    description:
      'Explore morphologies, electrophysiological recordings, ion channels, circuits, and models across different species.',
  },
  {
    id: 'skeletonize',
    label: 'Skeletonize',
    examples: ['em'],
    featured: 'em',
    description: 'Skeletonize electron microscopy meshes from MICrONS, H01, or your own data.',
  },
  {
    id: 'build',
    label: 'Build & simulate',
    examples: ['flywire', 'microcircuit', 'lfp'],
    featured: 'flywire',
  },
  {
    id: 'analyze',
    label: 'Analyze',
    examples: ['voltages', 'spikes', 'analysis', 'notebooks'],
    featured: 'spikes',
  },
  {
    id: 'ai',
    label: 'Ask AI',
    examples: ['ai-chat'],
    featured: 'ai-chat',
    description: 'Connect the OBI Plugin to your AI assistant and start prompting.',
  },
  {
    id: 'teaching',
    label: 'Teach & learn',
    examples: ['education'],
    featured: 'education',
    description: 'Teach through Moodle-connected courses and learn by joining OBI Summer Camps.',
  },
];

type TourContent = { slide: Slide; playing: boolean; controls: ReactNode };

export default function PlatformTour({
  children,
}: {
  children?: (tour: TourContent) => ReactNode;
} = {}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [failedVideos, setFailedVideos] = useState<string[]>([]);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cycle, setCycle] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const chapterRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const clock = useRef({ index: 0, cycle: 0, remaining: VIDEOS.models.duration });
  const slide = SLIDES[index];
  const chapterIndex = CHAPTERS.findIndex((item) => item.examples.includes(slide.id));
  const chapter = CHAPTERS[chapterIndex];
  const nextSlideId = CHAPTERS[(chapterIndex + 1) % CHAPTERS.length].featured;
  const activeVideo = slide.kind === 'video' ? VIDEOS[slide.source] : null;
  const delay =
    activeVideo?.duration ??
    (slide.kind === 'animation' ? ANIMATIONS[slide.source].duration : INTERVAL);
  const waitingForVideo = !!activeVideo && !reducedMotion && !failedVideos.includes(slide.id);
  const suspended = !inView || !pageVisible;
  const animate = playing && !reducedMotion && !suspended;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const respectMotion = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
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
    const video = videoRef.current;
    if (!video || !activeVideo) return;
    if (animate) void video.play()?.catch(() => {});
    else video.pause();
  }, [activeVideo, animate]);

  useEffect(() => {
    if (!playing || suspended || waitingForVideo) return;
    // Videos advance on completion; stills and animations use their display duration.
    if (clock.current.index !== index || clock.current.cycle !== cycle) {
      clock.current = { index, cycle, remaining: delay };
    }
    const started = Date.now();
    const timer = window.setTimeout(() => {
      setIndex(SLIDES.findIndex((item) => item.id === nextSlideId));
    }, clock.current.remaining);
    return () => {
      window.clearTimeout(timer);
      clock.current.remaining = Math.max(0, clock.current.remaining - (Date.now() - started));
    };
  }, [index, nextSlideId, cycle, delay, waitingForVideo, playing, suspended]);

  function selectExample(id: string) {
    const next = SLIDES.findIndex((item) => item.id === id);
    if (next < 0) return;
    if (next === index && videoRef.current) videoRef.current.currentTime = 0;
    setPlaying(true);
    setCycle((value) => value + 1);
    setIndex(next);
  }

  function handleChapterKeys(event: KeyboardEvent<HTMLButtonElement>, position: number) {
    let next: number;
    if (event.key === 'ArrowLeft') next = (position - 1 + CHAPTERS.length) % CHAPTERS.length;
    else if (event.key === 'ArrowRight') next = (position + 1) % CHAPTERS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = CHAPTERS.length - 1;
    else return;
    event.preventDefault();
    chapterRefs.current[next]?.focus();
    selectExample(CHAPTERS[next].featured);
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const next = (chapterIndex + (deltaX < 0 ? 1 : -1) + CHAPTERS.length) % CHAPTERS.length;
      selectExample(CHAPTERS[next].featured);
    }
  }

  const controls = (
    <div className={styles.navigation}>
      <fieldset className={styles.chapters} aria-label="Choose a research or teaching chapter">
        {CHAPTERS.map((item, position) => (
          <button
            type="button"
            key={item.id}
            ref={(element) => {
              chapterRefs.current[position] = element;
            }}
            className={styles.chapter}
            aria-pressed={position === chapterIndex}
            onClick={() => selectExample(item.featured)}
            onKeyDown={(event) => handleChapterKeys(event, position)}
          >
            {item.label}
            {position === chapterIndex && (
              <span className={styles.progress} key={`${index}-${cycle}`} aria-hidden="true" />
            )}
          </button>
        ))}
        <button
          type="button"
          className={styles.play}
          aria-label={playing ? 'Pause tour' : 'Play tour'}
          aria-pressed={playing}
          onClick={() => {
            setPlaying(!playing);
            setCycle((value) => value + 1);
          }}
        >
          <span aria-hidden="true">{playing ? 'Ⅱ' : '▷'}</span>
        </button>
      </fieldset>
      <div className={styles.chapterDetails}>
        {chapter.description ? (
          <p
            className={styles.chapterDescription}
            data-testid="chapter-description"
            aria-live={playing ? 'off' : 'polite'}
          >
            {chapter.description}
          </p>
        ) : chapter.examples.length > 1 ? (
          <fieldset className={styles.examples} aria-label="Examples in the selected chapter">
            <label className={styles.examplesLabel} htmlFor="tour-example">
              Example:
            </label>
            <select
              id="tour-example"
              className={styles.exampleSelect}
              aria-label="Choose an example"
              data-testid="current-example"
              value={slide.id}
              onChange={(event) => selectExample(event.target.value)}
            >
              {chapter.examples.map((id) => (
                <option key={id} value={id}>
                  {SLIDES.find((item) => item.id === id)?.label}
                </option>
              ))}
            </select>
          </fieldset>
        ) : null}
      </div>
    </div>
  );

  return (
    <section
      ref={rootRef}
      id="preview"
      className={styles.tour}
      style={{ '--chapter-duration': `${delay}ms` } as CSSProperties}
      data-playing={playing}
      data-suspended={suspended}
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
                (active && !reducedMotion ? (
                  <video
                    ref={videoRef}
                    className={styles.animation}
                    src={videoSource.src}
                    poster={videoSource.poster}
                    width={videoSource.width}
                    height={videoSource.height}
                    aria-label={item.alt}
                    autoPlay={animate}
                    muted
                    onEnded={() => {
                      if (playing && !suspended) {
                        setIndex(SLIDES.findIndex((entry) => entry.id === nextSlideId));
                      }
                    }}
                    onError={() => {
                      setFailedVideos((current) =>
                        current.includes(item.id) ? current : [...current, item.id]
                      );
                    }}
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
              {item.kind === 'placeholder' && (
                <Image
                  src={item.poster}
                  alt={item.alt}
                  width={1440}
                  height={810}
                  unoptimized
                  className={styles.animation}
                  loading="eager"
                />
              )}
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
      {children ? (
        children({ slide, playing: playing, controls })
      ) : (
        <div className={styles.standalone}>
          <div className={styles.caption} aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
            <h2>{slide.title}</h2>
            <p>{slide.description}</p>
          </div>
          {controls}
        </div>
      )}
    </section>
  );
}
