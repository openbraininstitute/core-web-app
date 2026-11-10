'use client';

import { useEffect, useRef } from 'react';

/** One stationary frame behind the entire public tour; chapters move over it. */
export function ChapterFrameBackground({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<{ setVisible: (visible: boolean) => void; dispose: () => void } | null>(
    null
  );
  const isActive = useRef(active);
  isActive.current = active;

  useEffect(() => {
    const surface = canvas.current;
    const tour = surface?.closest<HTMLElement>('[data-public-tour]');
    if (!surface || !tour) return;
    let disposed = false;
    let updateFrame = 0;
    let fingerprint = '';
    let create: typeof import('./chapter-frame-renderer').createChapterFrameRenderer | undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const measure = () => {
      updateFrame = 0;
      if (disposed || !create) return;
      tour.style.setProperty(
        '--chapter-scrollbar-width',
        `${tour.offsetWidth - tour.clientWidth}px`
      );
      const viewport = surface.parentElement!.getBoundingClientRect();
      const phone = viewport.width < 800;
      const fit = Math.min(viewport.width / 1920, viewport.height / 1080);
      const offsetX = phone ? 0 : (viewport.width - 1920 * fit) / 2;
      const offsetY = phone ? 0 : (viewport.height - 1080 * fit) / 2;
      Object.assign(surface.style, {
        position: 'absolute',
        left: `${offsetX}px`,
        top: `${offsetY}px`,
        width: `${phone ? viewport.width : 1920 * fit}px`,
        height: `${phone ? viewport.height : 1080 * fit}px`,
      });
      const bounds = surface.getBoundingClientRect();
      const chapter = tour.querySelector('#walkthrough-analysis');
      const media = chapter?.querySelector('[data-chapter-media]');
      const copy = chapter?.querySelector('[data-chapter-text]');
      if (!bounds.width || !bounds.height || !chapter || !media || !copy) return;
      const width = phone ? 960 : 1920;
      const scale = width / bounds.width;
      const height = phone ? Math.round(bounds.height * scale) : 1080;
      const chapterBounds = chapter.getBoundingClientRect();
      // Chapter-local coordinates cancel its scroll offset, so the field never follows a film.
      const rect = (element: Element) => {
        const box = element.getBoundingClientRect();
        return {
          x: (box.left - chapterBounds.left - offsetX) * scale,
          y: (box.top - chapterBounds.top - offsetY) * scale,
          w: box.width * scale,
          h: box.height * scale,
        };
      };
      const copyExclusions = Array.from(copy.querySelectorAll('h1, h2, p, a, button')).flatMap(
        (element) => {
          if (!['H1', 'H2', 'P'].includes(element.tagName)) return [rect(element)];
          const range = document.createRange();
          range.selectNodeContents(element);
          return Array.from(range.getClientRects()).map((box) => ({
            x: (box.left - chapterBounds.left - offsetX) * scale - 14,
            y: (box.top - chapterBounds.top - offsetY) * scale - 14,
            w: box.width * scale + 28,
            h: box.height * scale + 28,
          }));
        }
      );
      const logo = tour.querySelector('[data-walkthrough-logo]');
      const controls = [
        logo,
        logo?.nextElementSibling,
        tour.querySelector('[class*="chapterTimeline"]'),
        tour.querySelector('button[aria-label="Previous screen"]'),
        tour.querySelector('button[aria-label="Next screen"]'),
      ].filter((element): element is Element => !!element);
      const uiExclusions = controls.map((element) => {
        const box = element.getBoundingClientRect();
        return {
          x: (box.left - bounds.left) * scale - 14,
          y: (box.top - bounds.top) * scale - 14,
          w: box.width * scale + 28,
          h: box.height * scale + 28,
        };
      });
      const exclusions = [...copyExclusions, ...uiExclusions];
      const options = {
        width,
        height,
        video: rect(media),
        exclusions,
        reduced: preference.matches,
      };
      const next = JSON.stringify(options);
      if (fingerprint === next) return;
      fingerprint = next;
      renderer.current?.dispose();
      try {
        renderer.current = create(surface, tour, options);
        renderer.current.setVisible(isActive.current && !document.hidden);
        surface.dataset.frameReady = 'true';
      } catch {
        renderer.current = null;
        surface.dataset.frameReady = 'false';
      }
    };
    const schedule = () => {
      if (!updateFrame) updateFrame = requestAnimationFrame(measure);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(tour);
    const visibility = () => renderer.current?.setVisible(isActive.current && !document.hidden);
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', schedule);
    void Promise.all([import('./chapter-frame-renderer'), document.fonts.ready])
      .then(([module]) => {
        if (disposed) return;
        create = module.createChapterFrameRenderer;
        const media = tour.querySelector('#walkthrough-analysis [data-chapter-media]');
        if (media) resize.observe(media);
        schedule();
      })
      .catch(() => {
        if (!disposed) surface.dataset.frameReady = 'false';
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(updateFrame);
      resize.disconnect();
      renderer.current?.dispose();
      renderer.current = null;
      tour.style.removeProperty('--chapter-scrollbar-width');
      document.removeEventListener('visibilitychange', visibility);
      preference.removeEventListener('change', schedule);
    };
  }, []);

  useEffect(() => renderer.current?.setVisible(active && !document.hidden), [active]);

  return (
    <div
      aria-hidden="true"
      data-stationary-chapter-background
      className="pointer-events-none fixed inset-0 z-0"
    >
      <canvas ref={canvas} data-chapter-frame-background className="block h-full w-full" />
    </div>
  );
}
