'use client';

import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';

import type { ReactNode } from 'react';

import styles from './public-tour.module.css';

function MediaLayer({ draw }: { draw: (present: boolean) => ReactNode }) {
  const present = useIsPresent();
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="absolute inset-0"
      inert={!present || undefined}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: reduced ? 0 : 0.42, delay: reduced ? 0 : 0.08 },
      }}
      exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.32 } }}
    >
      {draw(present)}
    </motion.div>
  );
}

/** One media layer for every scene: videos, model mosaics and the AI demonstration all fade alike. */
export function FeatureMediaTransition({
  chapterId,
  draw,
}: {
  chapterId: string;
  draw: (present: boolean) => ReactNode;
}) {
  return (
    <div
      data-feature-media
      className={`pointer-events-none fixed inset-0 z-10 ${styles.chapterTextEntrance}`}
    >
      <AnimatePresence mode="wait">
        <MediaLayer key={chapterId} draw={draw} />
      </AnimatePresence>
    </div>
  );
}
