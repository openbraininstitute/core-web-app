'use client';

import { motion } from 'motion/react';
import { type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function NotebookInnerLayout({ children }: Props) {
  return (
    <motion.div
      id="notebook-inner-layout"
      className="bg-neutral-1 border-neutral-2 mx-2 mb-2 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] content-start gap-4 overflow-hidden rounded-2xl border p-5 [grid-area:main]"
      initial={false}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 30,
        mass: 0.6,
      }}
      style={{ willChange: 'grid-template-columns, grid-template-areas' }}
    >
      {children}
    </motion.div>
  );
}
