import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';

import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

interface ButtonCopyIdProps {
  className?: string;
  label?: string;
  tooltip?: string;
  value: string;
  classNames?: {
    button?: string;
    icon?: string;
    tooltip?: string;
  };
}

export function ButtonCopyId({
  value,
  tooltip = 'Database ID',
  label = 'Copy ID',
  classNames,
}: ButtonCopyIdProps) {
  const [, copyCampaignId, , copyingCampaignId] = useCopyToClipboard();

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            rounded
            variant="ghost"
            type="button"
            aria-label="Copy campaign ID"
            className={cn('pr-1 text-primary-9 ', classNames?.button)}
            size="md"
            onClick={() => copyCampaignId(value)}
          >
            <span className="text-base">{label}</span>
            <div
              className={cn(
                'flex size-8 items-center justify-center border',
                'rounded-full border-neutral-2 border-solid hover:bg-gray-100 transition-colors',
                classNames?.icon
              )}
            >
              {copyingCampaignId ? (
                <RiCheckLine className="text-green-400! text-sm" />
              ) : (
                <RiFileCopyLine className="text-sm text-gray-400" />
              )}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          sideOffset={-10}
          side="bottom"
          className={cn('z-999', classNames?.tooltip)}
          arrowClassName="bg-primary-9! z-9999"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
