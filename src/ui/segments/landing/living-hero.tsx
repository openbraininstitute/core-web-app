'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { BRAIN_THEME_LINKS, BRAIN_THEMES } from '@/ui/segments/project/brains-walkthrough/chapters';

import { FeaturedCubeModel, ModelCubeField } from './model-cube-field';

import styles from './living-hero.module.css';

const SLIDE_EASE = [0.65, 0, 0.35, 1] as const;
export const SCIENCE_SCENES = [
  { label: 'Build models', group: 'build', duration: 10000 },
  { label: 'Explore models', group: 'explore', duration: 14500 },
  { label: 'Inspect neurons', group: 'inspect', duration: 10000 },
  { label: 'Simulate activity', group: 'simulate', duration: 12000 },
] as const;

/** The public opening stays in place until the visitor chooses a chapter or scrolls. */
export function LivingHero({
  onContinue,
  onChapter,
}: {
  onContinue: () => void;
  onChapter: (id: string) => void;
}) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(true);
  const touchY = useRef<number | null>(null);
  const active = SCIENCE_SCENES[scene];
  const animate = playing && !reduced && visible;

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

  useEffect(() => {
    if (!animate) return;
    const timer = window.setTimeout(
      () => setScene((scene + 1) % SCIENCE_SCENES.length),
      SCIENCE_SCENES[scene].duration
    );
    return () => window.clearTimeout(timer);
  }, [animate, scene]);

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

  return (
    <section
      className={styles.hero}
      aria-label="Discover the Open Brain Platform"
      data-walkthrough-intro
      onWheel={(event) => {
        const host = event.currentTarget;
        if (event.deltaY > 20 && host.scrollTop + host.clientHeight >= host.scrollHeight - 8)
          onContinue();
      }}
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
      <div className={styles.composition}>
        <div className={styles.copy}>
          <h1 className={styles.headline}>
            Neuroscience <br />
            at the speed <br />
            of thought
          </h1>
          <p className={styles.caption} aria-live="polite" data-testid="science-caption">
            <AnimatePresence initial={false}>
              <motion.span
                key={active.label}
                className={styles.captionWords}
                initial={{ x: reduced ? 0 : '100%' }}
                animate={{ x: 0 }}
                exit={{ x: reduced ? 0 : '-100%' }}
                transition={{ duration: reduced ? 0 : 1, ease: SLIDE_EASE }}
              >
                {active.label}
              </motion.span>
            </AnimatePresence>
          </p>
          <Link className={styles.cta} href="/app/virtual-lab">
            Try it now <span aria-hidden>↗</span>
          </Link>
          <p className={styles.reassurance}>In your browser. Nothing to install.</p>
          <div className={styles.playback}>
            <span className={styles.progress} aria-hidden="true">
              <span
                key={scene}
                style={{
                  animationDuration: `${active.duration}ms`,
                  animationPlayState: animate ? 'running' : 'paused',
                }}
              />
            </span>
            <button
              type="button"
              onClick={() => setPlaying((current) => !current)}
              aria-label={playing ? 'Pause scientific visuals' : 'Play scientific visuals'}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
        <div className={styles.cubeBackdrop}>
          <ModelCubeField
            group={active.group}
            playing={false}
            reduced
            onSelect={(group) => {
              setScene(SCIENCE_SCENES.findIndex((item) => item.group === group));
              setPlaying(true);
            }}
          />
        </div>
        <div className={styles.showcase}>
          <AnimatePresence initial={false}>
            <motion.div
              key={active.group}
              className={styles.layer}
              initial={{ x: reduced ? 0 : '100%' }}
              animate={{ x: 0 }}
              exit={{ x: reduced ? 0 : '-100%' }}
              transition={{ duration: reduced ? 0 : 1, ease: SLIDE_EASE }}
            >
              <FeaturedCubeModel group={active.group} playing={animate} reduced={reduced} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <nav className={styles.chapters} aria-label="Platform sections">
        {BRAIN_THEMES.map((label) => (
          <button type="button" key={label} onClick={() => onChapter(BRAIN_THEME_LINKS[label])}>
            {label}
          </button>
        ))}
      </nav>
      <button className={styles.discover} type="button" onClick={onContinue}>
        Discover Virtual Labs <span aria-hidden>↓</span>
      </button>
    </section>
  );
}
