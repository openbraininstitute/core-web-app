import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

/** One icon in the view-mode pill. */
export interface IViewerModeOption {
  /** Tooltip text and accessible name. */
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}

interface ModeToggleProps {
  options: readonly IViewerModeOption[];
  className?: string;
}

/**
 * Pill switching the viewer between the views a host offers.
 *
 * Which views those are is the host's business — the circuit preview toggles 3D
 * against a designer image and, on an MEModel, a dendrogram; spike replay adds a
 * raster and a split — so the options come in whole rather than being enumerated
 * here.
 */
export function ModeToggle({ options, className }: ModeToggleProps) {
  // Nothing to switch between: a single-option pill reads as a button that
  // does nothing.
  if (options.length < 2) return null;

  return (
    <div
      id="preview-mode-toggle"
      data-slot="preview-mode-toggle"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md ring-1 ring-black/5',
        className
      )}
    >
      {options.map((option) => (
        <ModeButton
          key={option.label}
          active={option.active}
          label={option.label}
          icon={option.icon}
          onClick={option.onSelect}
        />
      ))}
    </div>
  );
}

function ModeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
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
            'inline-flex size-7 items-center justify-center rounded-full transition-colors',
            'focus-visible:outline-none',
            active ? 'bg-primary-8 text-white' : 'text-neutral-500 hover:bg-neutral-100'
          )}
        >
          {icon}
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
