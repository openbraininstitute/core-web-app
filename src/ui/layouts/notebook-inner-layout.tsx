'use client';

import { motion } from 'motion/react';
import { type ReactNode, useState } from 'react';

import { useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
};

export function NotebookInnerLayout({ children }: Props) {
  const [miniViewPresent, setMiniViewPresent] = useState(false);
  useSelectEntityClickEvent((ev) => {
    setMiniViewPresent(ev.detail.display);
  });

  return (
    <motion.div
      id="notebook-inner-layout"
      className={cn(
        'bg-neutral-1 border-neutral-2 mx-2 mb-2 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] content-start gap-4 overflow-hidden rounded-2xl border p-5 [grid-area:main]',
        { "grid-cols-[1fr_3fr] [grid-template-areas:'aside_body']": !miniViewPresent },
        { "grid-cols-[3fr_1fr] [grid-template-areas:'body_mini-view']": miniViewPresent }
      )}
      initial={false}
      animate={{
        gridTemplateColumns: miniViewPresent ? '3fr 1fr' : '1fr 3fr',
        gridTemplateAreas: miniViewPresent ? "'body mini-view'" : "'aside body'",
      }}
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
