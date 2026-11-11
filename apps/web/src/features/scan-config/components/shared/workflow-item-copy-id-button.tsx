'use client';

import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';

import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

interface WorkflowItemCopyIdButtonProps {
  value: string;
  onHoverChange?: (hovered: boolean) => void;
}

export function WorkflowItemCopyIdButton({ value, onHoverChange }: WorkflowItemCopyIdButtonProps) {
  const [, copyId, , copying] = useCopyToClipboard();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          rounded
          aria-label="Copy ID"
          className={cn(
            'group/copy-id h-8 min-w-8 gap-1 overflow-hidden px-0 text-primary-9',
            'transition-[width,padding] duration-200 hover:w-24 hover:px-2',
            'focus-visible:w-24 focus-visible:px-2'
          )}
          onClick={(event) => {
            event.stopPropagation();
            void copyId(value);
          }}
          onMouseEnter={() => onHoverChange?.(true)}
          onMouseLeave={() => onHoverChange?.(false)}
          onFocus={() => onHoverChange?.(true)}
          onBlur={() => onHoverChange?.(false)}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-neutral-2 transition-colors group-hover/copy-id:bg-gray-100">
            {copying ? (
              <RiCheckLine className="size-4 text-green-500!" />
            ) : (
              <RiFileCopyLine className="size-4 text-gray-400" />
            )}
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-[max-width,opacity] duration-200 group-hover/copy-id:max-w-16 group-hover/copy-id:opacity-100 group-focus-visible/copy-id:max-w-16 group-focus-visible/copy-id:opacity-100">
            Copy ID
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent avoidCollisions side="bottom" sideOffset={4} className="z-50">
        Copy workflow ID
      </TooltipContent>
    </Tooltip>
  );
}
