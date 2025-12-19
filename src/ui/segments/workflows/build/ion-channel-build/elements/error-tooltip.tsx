import { WarningFilled } from '@ant-design/icons';
import type { ReactNode } from 'react';

import { cn } from '@/utils/css-class';

export function RenderErrorTooltip({ isActive }: { isActive: boolean }): ReactNode {
  return (
    <span className="flex items-center">
      <WarningFilled
        className={cn('text-lg text-yellow-400', {
          'text-lg text-yellow-400': isActive,
        })}
      />
    </span>
  );
}

/* <Tooltip>
      <TooltipTrigger asChild>
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        align="center"
        side="bottom"
        sideOffset={4}
        collisionPadding={{ left: 0 }}
        arrowPadding={0}
        className="text-primary-8 bg-primary-0 z-[99999] max-w-60 text-sm text-wrap shadow-2xl"
        arrowClassName="bg-primary-0"
      >
        <div className="space-y-1">
          <ol className="list-disc space-y-1 pl-4 text-left">
            {errors.map((error, index) => (
              <li key={kebabCase(error)} className="text-xs">
                {error}
              </li>
            ))}
          </ol>
        </div>
      </TooltipContent>
    </Tooltip> */
