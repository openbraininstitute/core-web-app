'use client';

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

type Props = {
  children: ReactNode;
  detail?: ReactNode;
};

export function DataInnerLayout({ children, detail }: Props) {
  const { mdv, setMdv } = useMiniDetailView();
  const pathname = usePathname();
  const detailExpanded = /\/data\/view\//.test(pathname);
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  const gridTemplateColumns = detailExpanded ? '0fr 1fr' : mdv ? '3fr 2fr' : '27rem 1fr';
  const gridTemplateAreas = detailExpanded
    ? "'detail detail'"
    : mdv
      ? "'body mini-view'"
      : "'aside body'";

  return (
    <motion.div
      id="data-inner-layout"
      className={cn(
        'bg-background border-neutral-2 mx-2 mb-2 ml-3 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)]',
        'gap-4 overflow-hidden rounded-2xl border p-2 [grid-area:main]'
      )}
      initial={{
        gridTemplateColumns: '27rem 1fr',
        gridTemplateAreas: "'aside body'",
      }}
      animate={{ gridTemplateColumns, gridTemplateAreas }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 30,
        mass: 0.6,
      }}
      style={{ willChange: 'grid-template-columns, grid-template-areas' }}
    >
      {detailExpanded ? (
        <div className="min-h-0 min-w-0 overflow-hidden [grid-area:detail]">{detail}</div>
      ) : (
        children
      )}
    </motion.div>
  );
}
