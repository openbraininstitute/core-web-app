'use client';

import { RiArrowLeftLine, RiFilmLine } from '@remixicon/react';
import { motion } from 'motion/react';
import Link from 'next/link';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { DEFAULT_GET_STARTED_VIDEO_SLUG } from '@/ui/segments/project/get-started/query';

export function TutorialNotFound() {
  const { virtualLabId, projectId } = useWorkspace();
  const getStartedHref = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const defaultTutorialHref = `${getStartedHref}/tutorials/${DEFAULT_GET_STARTED_VIDEO_SLUG}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center justify-center rounded-xl bg-white mx-2 py-20 px-8 text-center shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]"
    >
      <div className="relative mb-6">
        <div className="flex items-center justify-center size-18 rounded-2xl bg-primary-9/5">
          <RiFilmLine className="text-primary-8 size-8" />
        </div>
        <div className="absolute -top-1 -right-1 size-3 rounded-full bg-neutral-3" />
      </div>

      <h3 className="text-primary-9 text-lg font-semibold mb-2">Tutorial not found</h3>
      <p className="text-neutral-4 text-sm max-w-xs leading-relaxed mb-8">
        This tutorial may have been moved or is no longer available. Browse the list below or head
        back to get started.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href={getStartedHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-2 bg-white px-5 py-2 text-sm font-medium text-primary-8 no-underline transition-colors hover:bg-neutral-1"
        >
          <RiArrowLeftLine className="size-4" />
          Get started
        </Link>
        <Link
          href={defaultTutorialHref}
          className="inline-flex items-center gap-2 rounded-full bg-primary-8 px-5 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-primary-9"
        >
          Browse tutorials
        </Link>
      </div>
    </motion.div>
  );
}
