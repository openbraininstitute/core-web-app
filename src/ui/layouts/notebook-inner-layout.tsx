'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
};

export function NotebookInnerLayout({ children }: Props) {
  const { setMdv } = useMiniDetailView();
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  return (
    <motion.div
      id="notebook-inner-layout"
      className={cn(
        // max-h-[calc(100vh-8rem)]
        'bg-background border-neutral-2 mx-2 mb-2 grid h-full max-h-[calc(100vh-3rem)] w-[calc(100%-10px)]',
        'content-start gap-4 overflow-hidden rounded-2xl border p-5 [grid-area:main]'
      )}
      // initial={{
      //   gridTemplateColumns: '1fr 3fr',
      //   gridTemplateAreas: "'aside body'",
      // }}
      // animate={{
      //   gridTemplateColumns: mdv ? '3fr 1fr' : '1fr 3fr',
      //   gridTemplateAreas: mdv ? "'body mini-view'" : "'aside body'",
      // }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 30,
        mass: 0.6,
      }}
      // style={{ willChange: 'grid-template-columns, grid-template-areas' }}
    >
      {children}
    </motion.div>
  );
}
