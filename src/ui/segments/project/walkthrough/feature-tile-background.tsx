'use client';

import { useEffect, useRef } from 'react';

import styles from './public-tour.module.css';

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
}: {
  active: boolean;
  chapterId: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef({ active, chapterId });
  current.current = { active, chapterId };
  useEffect(() => {
    const surface = canvas.current;
    const tour = surface?.closest<HTMLElement>('[data-public-tour]');
    if (!surface || !tour) return;
    let disposed = false;
    let engine:
      | ReturnType<typeof import('./feature-tile-renderer').createFeatureTileRenderer>
      | undefined;
    let frame = 0;
    let selected = '';
    let wasShown = false;
    let failed = false;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 800px)');
    const clear = () => tour.removeAttribute('data-feature-canvas-active');
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
      } else if (engine) tour.setAttribute('data-feature-canvas-active', '');
      if (engine && shown && selected !== current.current.chapterId) {
        const after = selected !== '';
        selected = current.current.chapterId;
        surface.dataset.featureChapter = selected;
        const source = chapterVideoSource(tour, after);
        engine.setSource(source.read, { empty: source.empty });
      }
      frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(layout);
    resize.observe(tour);
    layout();
    void import('./feature-tile-renderer').then(({ createFeatureTileRenderer }) => {
      if (disposed) return;
      try {
        engine = createFeatureTileRenderer(surface, tour, {
          frameRect: { x: 792, y: 209, w: 1040, h: 585 },
          reduced: preference.matches,
          onReady: () => {
            surface.dataset.featureTilesReady = 'true';
          },
          onError: () => {
            failed = true;
            tour.removeAttribute('data-feature-canvas-active');
            clear();
            surface.style.opacity = '0';
          },
        });
        layout();
        engine.setSource(() => null, { empty: true });
        tick();
      } catch {
        clear();
      }
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      engine?.dispose();
      tour.removeAttribute('data-feature-canvas-active');
      clear();
      tour.style.removeProperty('--chapter-scrollbar-width');
    };
  }, []);
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
