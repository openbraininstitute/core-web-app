'use client';

import { type ReactNode, useState } from 'react';
import { motion } from 'motion/react';

import { useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
};

export function ExploreInnerLayout({ children }: Props) {
  const [miniViewPresent, setMiniViewPresent] = useState(false);
  useSelectEntityClickEvent((ev) => {
    setMiniViewPresent(ev.detail.display);
  });

  return (
    <motion.div
      id="explore-inner-layout"
      className={cn(
        'bg-neutral-1 border-neutral-2 mx-2 mb-2 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] gap-4 overflow-hidden rounded-2xl border p-2 [grid-area:main]',
        { "grid-cols-[27rem_1fr] [grid-template-areas:'aside_body']": !miniViewPresent },
        { "grid-cols-[3fr_2fr] [grid-template-areas:'body_mini-view']": miniViewPresent }
      )}
      initial={false}
      animate={{
        gridTemplateColumns: miniViewPresent ? '3fr 2fr' : '27rem 1fr',
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
