import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

/**
 * A round icon button in the language the viewer chrome speaks: white, shadowed
 * and ringed, so it reads against whatever colour the scene happens to leave
 * behind it. Filled while `active`, the way the mode pill fills its current
 * view.
 *
 * `label` is both the tooltip and the accessible name — the button carries no
 * text of its own.
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
