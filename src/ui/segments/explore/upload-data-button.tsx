'use client';

import { PlusOutlined } from '@ant-design/icons';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Button } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * `compact` sizes it for a grid toolbar; `collapsed` folds it to its + alone (a phone's toolbar, making room);
 * `entityType`, when given, is preselected in the form.
 */
export function UploadDataButton({
  className,
  compact,
  collapsed = false,
  entityType = null,
  label = 'Upload data',
}: {
  className?: string;
  compact?: boolean;
  collapsed?: boolean;
  entityType?: TExtendedEntitiesTypeDict | null;
  label?: string;
}) {
  const breakpoint = useDefaultBreakpoint();

  const onContribute = () => {
    makeSelectContributionEntityClickEvent({
      display: true,
      entityType,
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
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        className={cn(
          'relative overflow-hidden border border-white/20 font-semibold',
          compact ? cn('h-10', collapsed ? 'px-[12px]' : 'px-4') : 'h-12 w-full px-6',
          'bg-linear-to-r from-green-600 via-green-700 to-green-700 bg-size-[200%_100%]',
          'transition-all duration-300 ease-out',
          'hover:scale-[1.02] active:scale-[0.98]',
          'disabled:cursor-not-allowed disabled:opacity-70'
        )}
      >
        <div className={cn('flex w-full items-center', !compact && 'justify-between gap-5')}>
          <span
            className={cn(
              compact &&
                'overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-300 ease-out',
              compact && (collapsed ? 'mr-0 max-w-0 opacity-0' : 'mr-2 max-w-[10rem] opacity-100')
            )}
            aria-hidden={collapsed || undefined}
          >
            {label}
          </span>
          <PlusOutlined className="ml-auto text-sm" />
        </div>
      </Button>
    </div>
  );
}
