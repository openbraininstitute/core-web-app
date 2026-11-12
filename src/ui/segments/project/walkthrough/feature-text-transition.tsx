'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { type ReactNode, useRef } from 'react';

import styles from './public-tour.module.css';

/** The supplied feature page's scrollText: 320 ms out, then 560 ms in, in the travel direction. */
export function FeatureTextTransition({
  chapter,
  children,
}: {
  chapter: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const previous = useRef(chapter);
  const travel = useRef(1);
  if (chapter !== previous.current) {
    travel.current = chapter > previous.current ? 1 : -1;
    previous.current = chapter;
  }
  const direction = travel.current;
  return (
    <div
      data-feature-copy
      className={`pointer-events-none fixed inset-0 z-20 overflow-hidden ${styles.chapterTextEntrance}`}
    >
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={chapter}
          custom={direction}
          initial={reduced ? false : { y: direction * 70, opacity: 0, filter: 'blur(4px)' }}
          animate={{
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            transition: {
              duration: reduced ? 0 : 0.56,
              delay: reduced ? 0 : 0.08,
              ease: [0.2, 0.7, 0.3, 1],
            },
          }}
          variants={{
            leaving: (way: number) => ({
              y: -way * 70,
              opacity: 0,
              filter: 'blur(4px)',
              transition: { duration: reduced ? 0 : 0.32, ease: [0.55, 0, 0.75, 0.45] },
            }),
          }}
          exit="leaving"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
