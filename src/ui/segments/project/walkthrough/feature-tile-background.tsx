'use client';

import { useEffect, useRef } from 'react';

import styles from './public-tour.module.css';

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
      }
      if (engine && shown && selected !== current.current.chapterId) {
        selected = current.current.chapterId;
        surface.dataset.featureChapter = selected;
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
