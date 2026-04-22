'use client';

import { RiPlayFill, RiTimeLine } from '@remixicon/react';
import Image from 'next/image';
import Link from 'next/link';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { DEFAULT_GET_STARTED_VIDEO_SLUG } from '@/ui/segments/project/get-started/query';
import { cn } from '@/utils/css-class';

export function MainVideo() {
  const { virtualLabId, projectId } = useWorkspace();
  return (
    <Link
      id="main-video-card"
      data-testid="main-video-card"
      className={cn(
        'bg-primary-8 bg-[linear-gradient(143.15deg,rgba(0,39,102,0.7)_35.12%,rgba(0,39,102,0)_72.91%)]',
        'p-4 py-40 rounded-xl mt-8 pb-18 relative flex items-start flex-col gap-3 shadow-sm overflow-hidden'
      )}
      href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/help/tutorials/${DEFAULT_GET_STARTED_VIDEO_SLUG}`}
    >
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
        <RiPlayFill className="text-white size-12 transition-all ease-in-expo" />
      </div>
      <div className="absolute left-4 top-2 flex flex-col items-start gap-2 w-max">
        <h1 className="w-max font-bold text-white text-2xl z-10">How to explore data?</h1>
        <div className="flex items-center justify-center gap-2 z-10">
          <div className="flex items-center justify-center gap-1.5 text-white">
            <RiTimeLine className="text-current size-4" /> <span className="text-sm">01:03</span>
          </div>
          <Badge rounded variant="outline" className="border-primary-4 text-white select-none">
            Data
          </Badge>
        </div>
      </div>
      <div className="absolute bottom-0 right-0 w-1/2 max-w-[600px] aspect-video">
        <Image
          src="/images/brain-visualization.png"
          alt=""
          fill
          className="object-contain object-bottom-right"
        />
      </div>
    </Link>
  );
}
