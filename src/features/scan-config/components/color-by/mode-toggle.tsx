import { RiBox3Line, RiImageLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

export const ViewerModeDict = {
  Viz: 'viz',
  Image: 'image',
} as const;
export type ViewerMode = (typeof ViewerModeDict)[keyof typeof ViewerModeDict];

interface ModeToggleProps {
  mode: ViewerMode;
  onChange: (mode: ViewerMode) => void;
  className?: string;
}

/** toggle switching the viewer between the 3D visualization and the image. */
export function ModeToggle({ mode, onChange, className }: ModeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md ring-1 ring-black/5',
        className
      )}
    >
      <ModeButton
        active={mode === ViewerModeDict.Viz}
        label="3D visualization"
        icon={<RiBox3Line className="size-4" />}
        onClick={() => onChange(ViewerModeDict.Viz)}
      />
      <ModeButton
        active={mode === ViewerModeDict.Image}
        label="Image"
        icon={<RiImageLine className="size-4" />}
        onClick={() => onChange(ViewerModeDict.Image)}
      />
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
  );
}
