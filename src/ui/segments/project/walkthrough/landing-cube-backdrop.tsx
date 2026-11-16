'use client';

import { useEffect, useRef } from 'react';

import { landingSeed, landingSmallsNow } from '@/ui/segments/landing/landing-tile-stage';

import styles from '@/ui/segments/landing/landing-tile-stage.module.css';

/**
 * Behind the public tour's chapters, the landing's own arrangement of tiles, all of them white, where they stood on
 * the landing: laid out from the landing's seed, on a stage scaled as the landing's is (user: "Same cube arrangement
 * should follow over all the remaining slides").
 */
/** Sent on the window as a change of chapter begins, for what moves with it. */
export const CHAPTER_SWITCH = 'chapter-switch';
/** Whether the tiles move about from chapter to chapter (off: user, "should not readjust between slides"). */
const STIR = false;

export function LandingCubeBackdrop({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const picks = useRef<HTMLDivElement>(null);
  const engine = useRef<{
    setVisible: (visible: boolean) => void;
    stir: () => void;
    setSmalls: (list: NonNullable<ReturnType<typeof landingSmallsNow>>) => void;
    dispose: () => void;
  } | null>(null);
  const isActive = useRef(active);
  isActive.current = active;

  useEffect(() => {
    const container = host.current;
    const composition = stage.current;
    const surface = canvas.current;
    const controls = picks.current;
    if (!container || !composition || !surface || !controls) return;
    let disposed = false;
    const tour = container.closest<HTMLElement>('[data-public-tour]');
    const resize = new ResizeObserver(() => {
      // (as the frame background did, for the chapters' layout)
      if (tour)
        tour.style.setProperty(
          '--chapter-scrollbar-width',
          `${tour.offsetWidth - tour.clientWidth}px`
        );
      const { width, height } = container.getBoundingClientRect();
      const phone = width < 800;
      const scale = phone ? Math.min(width / 1000, 0.39) : Math.min(width / 1920, height / 1080);
      composition.style.setProperty('--stage-scale', String(scale));
      composition.style.left = phone ? '0px' : `${(width - 1920 * scale) / 2 / scale}px`;
      composition.style.top = phone ? '0px' : `${(height - 1080 * scale) / 2 / scale}px`;
    });
    resize.observe(container);
    const phone = container.getBoundingClientRect().width < 800;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    void import('@/ui/segments/landing/landing-tile-renderer').then(
      ({ createLandingTileRenderer }) => {
        if (disposed) return;
        engine.current = createLandingTileRenderer(surface, controls, {
          seed: landingSeed(),
          backdrop: true,
          reduced,
          textInField: phone,
          heroBeside: !phone,
        });
        engine.current.setVisible(isActive.current && !document.hidden);
      }
    );
    return () => {
      disposed = true;
      engine.current?.dispose();
      engine.current = null;
      resize.disconnect();
    };
  }, []);

  useEffect(() => engine.current?.setVisible(active && !document.hidden), [active]);
  // As the landing goes, its white tiles where they are now (they change on each pick there); then the same tiles stay
  // put from chapter to chapter (user), unless STIR has them move about as each change of chapter begins.
  useEffect(() => {
    if (!active) return;
    const smalls = landingSmallsNow();
    if (smalls) engine.current?.setSmalls(smalls);
    if (!STIR) return;
    engine.current?.stir();
    const stir = () => engine.current?.stir();
    window.addEventListener(CHAPTER_SWITCH, stir);
    return () => window.removeEventListener(CHAPTER_SWITCH, stir);
  }, [active]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      data-stationary-chapter-background
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div ref={stage} className={styles.stage}>
        <canvas ref={canvas} className={styles.tiles} />
        <div ref={picks} hidden />
      </div>
    </div>
  );
}
