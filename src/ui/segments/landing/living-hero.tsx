'use client';

import { useEffect, useRef, useState } from 'react';

import { BRAIN_THEME_LINKS } from '@/ui/segments/project/brains-walkthrough/chapters';
import { THEME_NAV_RAIL, ThemeLine } from '@/ui/segments/project/brains-walkthrough/landing-themes';

import { informationFont } from './information-font';
import { LandingTileStage } from './landing-tile-stage';

import styles from './living-hero.module.css';

export const SCIENCE_SCENES = [
  { label: 'Simulate activity', group: 'simulate' },
  { label: 'Explore data', group: 'explore' },
  { label: 'Build models', group: 'build' },
  { label: 'Virtual labs', group: 'labs' },
] as const;
/** How long the opening stands, while the page is visible, before it glides on to the first chapter, ms. */
export const LANDING_AUTO_CONTINUE_MS = 8000;

/**
 * The public opening shows one of the science scenes, picked at random on each visit, then glides on to the
 * Virtual Labs chapter by itself unless the visitor gets there first (a chapter, the arrow or a scroll).
 */
export function LivingHero({
  onContinue,
  onChapter,
}: {
  onContinue: () => void;
  onChapter: (id: string) => void;
}) {
  // Picked once mounted, so the server's markup and the first client render agree.
  const [scene, setScene] = useState<number | null>(null);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const touchY = useRef<number | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const interacted = useRef(false);

  useEffect(() => {
    setScene(Math.floor(Math.random() * SCIENCE_SCENES.length));
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    const visibility = () => setVisible(document.visibilityState !== 'hidden');
    update();
    visibility();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  // The parent hands a fresh `onContinue` each render; the countdown must not restart with it.
  const continueRef = useRef(onContinue);
  useEffect(() => {
    continueRef.current = onContinue;
  }, [onContinue]);

  // Counts only while the page is shown: a tab opened in the background still opens on the landing.
  const shownFor = useRef(0);
  useEffect(() => {
    if (!visible || shownFor.current >= LANDING_AUTO_CONTINUE_MS) return;
    const started = performance.now();
    const timer = window.setTimeout(() => {
      shownFor.current = LANDING_AUTO_CONTINUE_MS;
      if (!interacted.current) continueRef.current();
    }, LANDING_AUTO_CONTINUE_MS - shownFor.current);
    return () => {
      shownFor.current = Math.min(
        LANDING_AUTO_CONTINUE_MS,
        shownFor.current + performance.now() - started
      );
      window.clearTimeout(timer);
    };
  }, [visible]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('a, button, input, select, textarea')
      )
        return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onContinue]);

  useEffect(() => {
    const host = heroRef.current;
    if (!host) return;
    let distance = 0;
    let previous = 0;
    let leaving = false;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      const atBottom = host.scrollTop + host.clientHeight >= host.scrollHeight - 8;
      if (event.deltaY <= 0 || !atBottom) {
        distance = 0;
        return;
      }
      // Own the gesture at the end of the landing instead of scrolling the chapter underneath it.
      event.preventDefault();
      event.stopPropagation();
      if (leaving) return;
      const now = performance.now();
      if (now - previous > 300) distance = 0;
      previous = now;
      distance +=
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? host.clientHeight : 1);
      if (distance >= 24) {
        leaving = true;
        onContinue();
      }
    };
    host.addEventListener('wheel', wheel, { passive: false });
    return () => host.removeEventListener('wheel', wheel);
  }, [onContinue]);

  return (
    <section
      ref={heroRef}
      className={`${styles.hero} ${informationFont.variable}`}
      aria-label="Discover the Open Brain Platform"
      data-walkthrough-intro
      onTouchStart={(event) => {
        touchY.current = event.touches[0]?.clientY ?? null;
      }}
      onTouchEnd={(event) => {
        if (
          touchY.current !== null &&
          touchY.current - (event.changedTouches[0]?.clientY ?? touchY.current) > 60 &&
          event.currentTarget.scrollTop + event.currentTarget.clientHeight >=
            event.currentTarget.scrollHeight - 8
        )
          onContinue();
        touchY.current = null;
      }}
    >
      {scene !== null && (
        <LandingTileStage
          scene={scene}
          reduced={reduced}
          visible={visible}
          onSelect={setScene}
          onInteraction={() => {
            interacted.current = true;
          }}
        />
      )}
      <button
        type="button"
        className={styles.nextChapter}
        aria-label="Next screen"
        onClick={onContinue}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <nav className={THEME_NAV_RAIL} aria-label="Platform sections">
        <ThemeLine links={BRAIN_THEME_LINKS} goTo={onChapter} publicAppearance />
      </nav>
    </section>
  );
}
