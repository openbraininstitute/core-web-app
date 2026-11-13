'use client';

import { motion } from 'motion/react';

import { useMediaQuery } from '@/hooks/use-media-query';

import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function DataInnerLayout({ children }: Props) {
  const { mdv, setMdv } = useMiniDetailView();
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });
  const phone = useMediaQuery('(max-width: 767px)', false);

  // on a phone, down the page: the mini atlas and what to look at over the table, scrolling as one
  if (phone)
    return (
      <div
        id="data-inner-layout"
        className="no-scrollbar flex h-full min-h-0 w-full flex-col gap-3 overflow-x-hidden overflow-y-auto px-2 pt-2 pb-4 [grid-area:main]"
      >
        {children}
      </div>
    );

  return (
    <motion.div
      id="data-inner-layout"
      className={cn(
        // no box of its own round the Data page: its panels sit straight on the page
        'grid w-full grid-rows-[minmax(0,1fr)]',
        'gap-4 overflow-hidden px-3 pt-3 pb-2 [grid-area:main]'
      )}
      initial={{
        gridTemplateColumns: '27rem 1fr',
        gridTemplateAreas: "'aside body'",
      }}
      animate={{
        gridTemplateColumns: mdv ? '3fr 2fr' : '24rem 1fr',
        gridTemplateAreas: mdv ? "'body mini-view'" : "'aside body'",
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
