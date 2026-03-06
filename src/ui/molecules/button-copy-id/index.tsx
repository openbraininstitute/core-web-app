import { CheckOutlined, CopyOutlined } from '@ant-design/icons';

import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

interface ButtonCopyIdProps {
  className?: string;
  label?: string;
  tooltip?: string;
  value: string;
}

export function ButtonCopyId({
  value,
  tooltip = 'Database ID',
  label = 'Copy ID',
}: ButtonCopyIdProps) {
  const [, copyCampaignId, , copyingCampaignId] = useCopyToClipboard();

  return (
    <div className="flex items-center gap-3">
      <Tooltip>
        <TooltipTrigger>
          <Button
            rounded
            variant="ghost"
            type="button"
            aria-label="Copy campaign ID"
            className="pr-1"
            size="md"
            onClick={() => copyCampaignId(value)}
          >
            <span className="text-primary-9 text-base">{label}</span>
            <div
              className={cn(
                'flex size-8 items-center justify-center border ',
                'rounded-full border-neutral-2 border-solid hover:bg-gray-100 transition-colors'
              )}
            >
              {copyingCampaignId ? (
                <CheckOutlined className="text-green-400! text-sm" />
              ) : (
                <CopyOutlined className="text-primary-8 text-sm" />
              )}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          sideOffset={-10}
          side="bottom"
          className="z-999"
          arrowClassName="bg-primary-9! z-9999"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
