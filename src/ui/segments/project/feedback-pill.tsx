'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { FeedbackStarIcon } from '@/components/icons/FeedbackStarIcon';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Badge } from '@/ui/molecules/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

const FeedbackModal = dynamic(() => import('@/ui/segments/feedbacks/feedback-modal'), {
  ssr: false,
});

export function FeedbackPill() {
  const breakpoint = useDefaultBreakpoint();
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <>
      <Tooltip open={open ? false : tooltipOpen}>
        <TooltipTrigger
          asChild
          onPointerEnter={() => setTooltipOpen(true)}
          onPointerLeave={() => setTooltipOpen(false)}
        >
          <Badge
            asChild
            rounded
            id="workspace-feedbacks"
            className={cn(
              'font-bold bg-background select-none cursor-pointer shrink-0',
              'hover:shadow-sm hover:bg-background',
              'p-0! flex items-center justify-center',
              breakpoint === 'xl' ? 'size-12!' : 'size-10!'
            )}
            variant="outline"
            size={breakpoint === 'xl' ? 'lg' : 'md'}
          >
            <button type="button" onClick={() => setOpen(true)} aria-label="Submit feedback">
              <FeedbackStarIcon className="text-primary-9 h-6! w-6!" />
            </button>
          </Badge>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="bottom"
          sideOffset={1}
          collisionPadding={{ bottom: 20 }}
          className="text-primary-8 max-w-[200px] bg-white text-base text-balance shadow-lg"
          arrowClassName="bg-white"
        >
          <div className="font-bold">Feedback</div>
          <p className="hyphens-auto">Share your thoughts, report bugs, or suggest new features.</p>
        </TooltipContent>
      </Tooltip>

      {open && <FeedbackModal open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

export default FeedbackPill;
