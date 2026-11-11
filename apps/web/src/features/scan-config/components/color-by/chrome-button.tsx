import { RiFullscreenExitLine, RiFullscreenLine } from '@remixicon/react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';
import { toggleFullscreen, useFullscreenElement } from '@/utils/fullscreen';

/**
 * A round icon button for the viewer chrome: white and shadowed so it reads over
 * the 3D canvas, filled while `active`. `label` is both the tooltip and the
 * accessible name.
 */
export function ChromeButton({
  label,
  testId,
  onClick,
  active,
  children,
}: {
  label: string;
  /** E2E handle, for the buttons whose label flips with the state they toggle. */
  testId?: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-testid={testId}
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

/**
 * The one fullscreen control a view offers. Both the label and the click read
 * `target` rather than whatever fills the screen: a second viewer on the page
 * has a button of its own.
 */
export function FullscreenButton({ target }: { target: HTMLElement | null }) {
  const fullscreen = useFullscreenElement();
  const isFullscreen = target !== null && fullscreen === target;

  return (
    <ChromeButton
      label={isFullscreen ? 'Exit full screen' : 'Full screen'}
      testId="viewer-full-screen"
      onClick={() => toggleFullscreen(target)}
      active={isFullscreen}
    >
      {isFullscreen ? (
        <RiFullscreenExitLine className="size-4" />
      ) : (
        <RiFullscreenLine className="size-4" />
      )}
    </ChromeButton>
  );
}
