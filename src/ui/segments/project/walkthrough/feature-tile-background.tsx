'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './public-tour.module.css';

/** Where the chapters' films are painted on the tiles, in the 1920 x 1080 stage's px (16:9). */
const FRAME = { x: 672, y: 190, w: 1160, h: 652.5 };
/** Where a chapter's film is laid inside its frame, when not fitted to it. */
type TFrame = typeof FRAME & { video?: { x: number; y: number; w: number } };
/** Chapters whose film is drawn larger: Get Started's globe. Its tiles are the room between the words (their right
 * end, x 590) and the page's right edge, under the header's button and above the logos. The film is laid with its
 * globe in the middle of that room (the globe's middle is at 0.567 and 0.467 of the film's width and height), as
 * large as lets everything the film ever shows, its opening sparks included, stay inside the room: that reaches
 * 0.117-0.903 of its width and 0.10-0.83 of its height (measured over every frame). */
const JOIN_ROOM = { x: 590, y: 84, w: 1330, h: 771 };
const JOIN_FILM_W = 1350;
const JOIN_FILM_H = (JOIN_FILM_W * 1066) / 1440;
const CHAPTER_FRAMES: Record<string, TFrame> = {
  join: {
    ...JOIN_ROOM,
    video: {
      x: JOIN_ROOM.x + JOIN_ROOM.w / 2 - 0.567 * JOIN_FILM_W,
      y: JOIN_ROOM.y + JOIN_ROOM.h / 2 - 0.467 * JOIN_FILM_H,
      w: JOIN_FILM_W,
    },
  },
};

/** How long a chapter's media layer may be up without a video before its tiles rise white, ms. */
const NO_VIDEO_AFTER = 200;

/**
 * The chapter's film, painted on the tiles as on the supplied features page: found in the media layer that is on
 * (not the one fading out). The film itself keeps playing there, unseen, for playback and accessibility.
 */
function chapterVideoSource(tour: HTMLElement, after: boolean) {
  const layers = () => [...tour.querySelectorAll<HTMLElement>('[data-feature-media] > div')];
  // a chapter after another: its layer is a new one, never the one already up (which is leaving)
  const before = new Set(after ? layers() : []);
  let layer: HTMLElement | null = null;
  let video: HTMLVideoElement | null = null;
  let layerSince = 0;
  const find = () => {
    // once found, a source keeps to its own layer and film, even once they have gone: the tiles sinking with the
    // old chapter (with a film or without, as the AI one) must never pick up the next one's
    if (video) return video;
    layer ??=
      layers().find((element) => !element.hasAttribute('inert') && !before.has(element)) ?? null;
    if (!layer) return null;
    layerSince ||= performance.now();
    video = layer.querySelector<HTMLVideoElement>('[data-chapter-media] video');
    return video;
  };
  return {
    read: () => {
      const element = find();
      if (!element || element.readyState < 2 || element.seeking) return null;
      return { image: element, stamp: element.currentTime };
    },
    empty: () => !find() && layerSince > 0 && performance.now() - layerSince > NO_VIDEO_AFTER,
  };
}

/** The supplied feature-page canvas, using the tour's existing videos and playback clock. */
export function FeatureTileBackground({
  active,
  chapterId,
  stationary = false,
}: {
  active: boolean;
  chapterId: string;
  /** Keep one white tile field through every middle chapter, with no media repaint or entrance replay. */
  stationary?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sync = useRef<(() => void) | null>(null);
  const [initialized, setInitialized] = useState(false);
  const current = useRef({ active, chapterId });
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 800px)');
    const enter = () => {
      if (active && desktop.matches) setInitialized(true);
    };
    enter();
    desktop.addEventListener('change', enter);
    return () => desktop.removeEventListener('change', enter);
  }, [active]);
  useEffect(() => {
    current.current = { active, chapterId };
    sync.current?.();
  }, [active, chapterId]);
  useEffect(() => {
    if (!initialized) return;
    const surface = canvas.current;
    const tour = surface?.closest<HTMLElement>('[data-public-tour]');
    if (!surface || !tour) return;
    let disposed = false;
    let engine:
      | ReturnType<typeof import('./feature-tile-renderer').createFeatureTileRenderer>
      | undefined;
    let selected = '';
    let wasShown = false;
    let failed = false;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 800px)');
    const clear = () => {
      if (!stationary) tour.removeAttribute('data-feature-canvas-active');
    };
    const layout = () => {
      const box = tour.getBoundingClientRect();
      const scale = Math.min(box.width / 1920, box.height / 1080);
      const width = Math.round(box.width / scale),
        height = Math.round(box.height / scale);
      Object.assign(surface.style, {
        width: `${box.width}px`,
        height: `${box.height}px`,
        left: '0px',
        top: '0px',
      });
      engine?.resize(width, height, (width - 1920) / 2, (height - 1080) / 2);
      tour.style.setProperty(
        '--chapter-scrollbar-width',
        `${tour.offsetWidth - tour.clientWidth}px`
      );
    };
    const tick = () => {
      if (disposed) return;
      const shown = current.current.active && desktop.matches && !document.hidden && !failed;
      if (shown !== wasShown) {
        engine?.setVisible(shown);
        wasShown = shown;
      }
      surface.style.opacity = shown ? '1' : '0';

      if (!shown) {
        clear();
        selected = '';
      } else if (engine && !stationary) tour.setAttribute('data-feature-canvas-active', '');
      if (engine && shown && !stationary && selected !== current.current.chapterId) {
        const after = selected !== '';
        selected = current.current.chapterId;
        surface.dataset.featureChapter = selected;
        const source = chapterVideoSource(tour, after);
        const closing = selected === 'join';
        // the globe film begins again each time its chapter comes up: until it has gone back to its start, nothing
        // is read from it, so the tiles never show a frame it was left on (user)
        let restarted = false;
        engine.setSource(
          closing
            ? () => {
                const video = tour.querySelector<HTMLVideoElement>(
                  '#walkthrough-join [data-stage-current="true"] video'
                );
                if (!video || video.readyState < 1) return null;
                if (!restarted) {
                  restarted = true;
                  video.currentTime = 0;
                  void video.play().catch(() => {});
                  return null;
                }
                return video.readyState >= 2 && !video.seeking
                  ? { image: video, stamp: video.currentTime }
                  : null;
              }
            : source.read,
          {
            empty: closing ? false : source.empty,
            frame: CHAPTER_FRAMES[selected] ?? FRAME,
          }
        );
      }
    };
    sync.current = tick;
    document.addEventListener('visibilitychange', tick);
    desktop.addEventListener('change', tick);
    const resize = new ResizeObserver(layout);
    resize.observe(tour);
    layout();
    void import('./feature-tile-renderer').then(({ createFeatureTileRenderer }) => {
      if (disposed) return;
      try {
        engine = createFeatureTileRenderer(surface, tour, {
          frameRect: FRAME,
          reduced: preference.matches,
          onReady: () => {
            surface.dataset.featureTilesReady = 'true';
          },
          onError: () => {
            failed = true;
            clear();
            surface.style.opacity = '0';
          },
        });
        layout();
        engine.setSource(() => null, { empty: true });
        // Raise the shared white field once; subsequent chapter changes leave its geometry untouched.
        if (stationary) engine.setSource(() => null, { empty: true });
        tick();
      } catch {
        clear();
      }
    });
    return () => {
      disposed = true;
      sync.current = null;
      document.removeEventListener('visibilitychange', tick);
      desktop.removeEventListener('change', tick);
      resize.disconnect();
      engine?.dispose();
      clear();
      tour.style.removeProperty('--chapter-scrollbar-width');
    };
  }, [stationary, initialized]);
  return (
    <div
      aria-hidden="true"
      data-feature-tiles
      data-entered={active || undefined}
      className={`pointer-events-none fixed inset-0 z-0 ${styles.chapterEntrance}`}
    >
      <canvas ref={canvas} className="absolute block" />
    </div>
  );
}
