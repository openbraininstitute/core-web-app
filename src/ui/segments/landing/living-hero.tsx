'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/ui/hooks/use-prefers-reduced-motion';
import { BRAIN_THEME_LINKS } from '@/ui/segments/project/brains-walkthrough/chapters';
import { THEME_NAV_RAIL, ThemeLine } from '@/ui/segments/project/brains-walkthrough/landing-themes';

import { informationFont } from './information-font';
import { LANDING_MODELS } from './landing-models';
import { LANDING_WAY_IN, LandingTileStage } from './landing-tile-stage';

import styles from './living-hero.module.css';

/** Open with the cortical column, followed by FlyWire and the skeleton neuron. */
export const FIRST_SCENE = 0;
/** How long the landing stands, once all of it is in, before it glides on to the first chapter by itself, ms (the
 * logo going up into its corner as it does); once a page load, not again on coming back to it. */
export const LANDING_AUTO_CONTINUE_MS = 8000;
let autoContinued = false;
/** The three-second tour of every model, then on into Virtual Labs (off in this version: the films loop beside the
 * field on their own, LandingTileStage's FILM_MS, and the landing goes on after LANDING_AUTO_CONTINUE_MS). */
const MODEL_TOUR = false;
export function LivingHero({
  onContinue,
  onChapter,
}: {
  onContinue: () => void;
  onChapter: (id: string) => void;
}) {
  // Set once mounted, as the tiles are drawn in the browser alone.
  const [scene, setScene] = useState(FIRST_SCENE);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(true);
  const touchY = useRef<number | null>(null);
  const interacted = useRef(false);
  const tourStep = useRef(0);
  const continueFromIdle = useRef(onContinue);
  useLayoutEffect(() => {
    continueFromIdle.current = onContinue;
  }, [onContinue]);
  const heroRef = useRef<HTMLElement>(null);
  // The chapters along the foot and the arrow down come in last, with the landing's way in.
  const [wayIn, setWayIn] = useState(false);
  useEffect(() => {
    const show = () => setWayIn(true);
    window.addEventListener(LANDING_WAY_IN, show);
    return () => window.removeEventListener(LANDING_WAY_IN, show);
  }, []);
  // (as the tour before it) not with reduced motion, nor once the visitor has touched anything on the page
  useEffect(() => {
    if (!wayIn || autoContinued || reduced || interacted.current) return;
    const timer = window.setTimeout(() => {
      if (interacted.current) return;
      autoContinued = true;
      onChapter(BRAIN_THEME_LINKS['Virtual Labs']);
    }, LANDING_AUTO_CONTINUE_MS);
    return () => window.clearTimeout(timer);
  }, [wayIn, reduced, onChapter]);
  const lastIn = {
    opacity: wayIn ? 1 : 0,
    transition: 'opacity 700ms ease',
    pointerEvents: wayIn ? undefined : 'none',
  } as const;

  useEffect(() => {
    const visibility = () => setVisible(document.visibilityState !== 'hidden');
    visibility();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    if (!wayIn || reduced || !visible || interacted.current) return;
    const timer = window.setInterval(() => {
      if (!MODEL_TOUR || interacted.current || document.hidden) return;
      tourStep.current += 1;
      if (tourStep.current < LANDING_MODELS.length) {
        setScene((FIRST_SCENE + tourStep.current) % LANDING_MODELS.length);
      } else {
        interacted.current = true;
        window.clearInterval(timer);
        continueFromIdle.current();
      }
    }, 3000);
    const cancel = () => {
      interacted.current = true;
      window.clearInterval(timer);
    };
    // Include the header and portalled chapter menu, not only the artwork.
    const events = [
      'pointerdown',
      'pointermove',
      'touchstart',
      'wheel',
      'keydown',
      'click',
      'focusin',
    ];
    for (const event of events)
      window.addEventListener(event, cancel, { capture: true, passive: true });
    return () => {
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, cancel, true);
    };
  }, [wayIn, reduced, visible]);

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
      <LandingTileStage scene={scene} reduced={reduced} visible={visible} onSelect={setScene} />
      <nav
        className={`${THEME_NAV_RAIL} ${styles.homeChapterRail}`}
        aria-label="Platform sections"
        style={lastIn}
      >
        <div className={styles.chapterNavigation}>
          <ThemeLine
            links={BRAIN_THEME_LINKS}
            goTo={onChapter}
            publicAppearance
            mobileLabel="See what you can do"
          />
          <button type="button" className={styles.tourLink} onClick={onContinue}>
            See what you can do
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
        </div>
      </nav>
    </section>
  );
}
