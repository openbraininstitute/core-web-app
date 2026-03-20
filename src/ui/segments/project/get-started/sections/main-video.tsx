'use client';

import { RiPlayFill, RiTimeLine } from '@remixicon/react';
import Link from 'next/link';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export function MainVideo() {
  const { virtualLabId, projectId } = useWorkspace();
  return (
    <div
      className={cn(
        ' bg-primary-8 bg-[linear-gradient(143.15deg,rgba(0,39,102,0.7)_35.12%,rgba(0,39,102,0)_72.91%)]',
        'p-4 rounded-xl mt-8 pb-18 relative flex items-start flex-col gap-3 shadow-sm'
      )}
    >
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
        <Button
          asChild
          variant="icon"
          type="button"
          className="hover:scale-110 transition-all ease-in-expo"
        >
          <Link
            href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/tutorials?t=how-to-explore-data`}
          >
            <RiPlayFill className="text-white size-10" />
          </Link>
        </Button>
      </div>
      <h1 className="w-1/3 font-bold text-white text-2xl">
        What is meant by "Data" <br /> and "Workflows"
      </h1>
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center justify-center gap-1.5 text-white">
          <RiTimeLine className="text-current size-4" /> <span className="text-sm">01:03</span>
        </div>
        <Badge rounded variant="outline" className="border-primary-4 text-white select-none">
          Data
        </Badge>
        <Badge rounded variant="outline" className="border-primary-4 text-white select-none">
          Workflows
        </Badge>
      </div>
    </div>
  );
}
