'use client';

import { PlusOutlined } from '@ant-design/icons';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { cn } from '@/utils/css-class';

/** `compact` sizes it for a grid toolbar, beside the h-10 search pill. */
export function UploadDataButton({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const breakpoint = useDefaultBreakpoint();

  const onContribute = () => {
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType: null,
      sessionId: crypto.randomUUID(),
    });
  };

  return (
    <div className={className} id="upload-data-selector" data-testid="upload-data-selector">
      <Button
        rounded
        variant="success"
        size={breakpoint === 'xl' && !compact ? 'lg' : 'md'}
        type="button"
        onClick={onContribute}
        className={cn(
          'relative overflow-hidden border border-white/20 font-semibold',
          compact ? 'h-10 px-4' : 'h-12 w-full px-6',
          'bg-linear-to-r from-green-600 via-green-700 to-green-700 bg-size-[200%_100%]',
          'transition-all duration-300 ease-out',
          'hover:scale-[1.02] active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-70'
        )}
      >
        <div
          className={cn('flex w-full items-center', compact ? 'gap-2' : 'justify-between gap-5')}
        >
          <span>Upload data</span>
          <PlusOutlined className="ml-auto text-sm" />
        </div>
      </Button>
    </div>
  );
}
