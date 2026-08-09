import { RiImageLine } from '@remixicon/react';

import { GameIconsFamilyTree } from '@/components/icons/FamilyTree';
import { F7View3d } from '@/components/icons/View3d';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

export const ViewerModeDict = {
  Visualization: 'viz',
  Image: 'image',
  Dendrogram: 'dendrogram',
} as const;
export type ViewerMode = (typeof ViewerModeDict)[keyof typeof ViewerModeDict];

interface ModeToggleProps {
  mode: ViewerMode;
  onChange: (mode: ViewerMode) => void;
  className?: string;
  /** Show the dendrogram tab. Off unless the host can supply a section tree. */
  showDendrogram?: boolean;
  /** Show the image tab. Off when the entity carries no designer image. */
  showImage?: boolean;
}

/** toggle switching the viewer between the 3D visualization and the image. */
export function ModeToggle({
  mode,
  onChange,
  className,
  showDendrogram = false,
  showImage = true,
}: ModeToggleProps) {
  return (
    <div
      id="preview-mode-toggle"
      data-slot="preview-mode-toggle"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md ring-1 ring-black/5',
        className
      )}
    >
      <ModeButton
        active={mode === ViewerModeDict.Visualization}
        label="3D visualization"
        icon={<F7View3d className="size-4" />}
        onClick={() => onChange(ViewerModeDict.Visualization)}
      />
      {showImage && (
        <ModeButton
          active={mode === ViewerModeDict.Image}
          label="Image"
          icon={<RiImageLine className="size-4" />}
          onClick={() => onChange(ViewerModeDict.Image)}
        />
      )}
      {showDendrogram && (
        <ModeButton
          active={mode === ViewerModeDict.Dendrogram}
          label="Dendrogram"
          icon={<GameIconsFamilyTree className="size-4" />}
          onClick={() => onChange(ViewerModeDict.Dendrogram)}
        />
      )}
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
