import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

/**
 * A round icon button for the viewer chrome: white and shadowed so it reads over
 * the 3D canvas, filled while `active`. `label` is both the tooltip and the
 * accessible name.
 */
export function ChromeButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full transition-colors',
            'shadow-md ring-1 ring-black/5 focus-visible:outline-none',
            active ? 'bg-primary-8 text-white' : 'bg-white text-neutral-500 hover:bg-neutral-100'
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        align="center"
        side="bottom"
        sideOffset={0}
        arrowClassName="bg-gray-200"
        className="text-primary-9 bg-gray-200"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
