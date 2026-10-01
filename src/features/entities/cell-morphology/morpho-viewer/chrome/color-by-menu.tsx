import { RiArrowDownSLine } from '@remixicon/react';
import { useState } from 'react';

import { useChromeDismiss } from '@/features/scan-config/components/color-by/chrome-menu';
import { mutedStyle, panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { focusChosen, PillOption } from '@/features/viewer-3d/chrome/pill-option';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { HelpButton } from './menu-rows';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { ColorBy } from '../use-viewer-settings';

const OPTIONS: { value: ColorBy; label: string; detail: string }[] = [
  { value: 'section', label: 'Section', detail: 'Each neurite type in its own colour' },
  { value: 'distance', label: 'Distance', detail: 'Path distance from the soma' },
];

interface ColorByMenuProps {
  value: ColorBy;
  onChange(value: ColorBy): void;
  theme: ViewerTheme;
  /** Why the neurite colours have no effect in the current look, where they have none. */
  reason: string | null;
}

/** "Colour by Section ▾", as the circuit viewer's pill. */
export function ColorByMenu({ value, onChange, theme, reason }: ColorByMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useChromeDismiss(open, close);
  const label = OPTIONS.find((o) => o.value === value)?.label ?? value;

  const trigger = (
    <PopoverTrigger
      data-testid="morphology-color-by"
      disabled={reason !== null}
      aria-label={`Colour by: ${label}`}
      style={panelStyle(theme)}
      className={cn(
        'group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold',
        'backdrop-blur-sm transition-colors hover:brightness-110 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100'
      )}
    >
      <span style={mutedStyle(theme)}>Colour by</span>
      <span>{label}</span>
      <RiArrowDownSLine
        className={cn(
          'size-4 transition-transform duration-300 motion-reduce:transition-none',
          open && 'rotate-180'
        )}
        style={mutedStyle(theme)}
      />
    </PopoverTrigger>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {reason ? (
        <Tooltip>
          {/* A disabled button takes no pointer events: the tooltip hangs on its wrapper. */}
          <TooltipTrigger asChild>
            <span className="inline-flex">{trigger}</span>
          </TooltipTrigger>
          <TooltipContent
            align="center"
            side="bottom"
            sideOffset={0}
            arrowClassName="bg-gray-200"
            className="text-primary-9 bg-gray-200"
          >
            {reason}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <PopoverContent
        align="end"
        sideOffset={6}
        style={panelStyle(theme)}
        className="w-60 rounded-xl border-gray-100 p-1 shadow-xl backdrop-blur-xl"
        onOpenAutoFocus={focusChosen}
      >
        <div className="flex items-center px-2 py-1.5" data-help-anchor>
          <span className="text-xs uppercase tracking-wide" style={mutedStyle(theme)}>
            Colour by
          </span>
          <HelpButton topic="color-by" title="Colour by" />
        </div>
        <ul>
          {OPTIONS.map((o) => (
            <PillOption
              key={o.value}
              label={o.label}
              detail={o.detail}
              selected={o.value === value}
              theme={theme}
              onClick={() => {
                onChange(o.value);
                close();
              }}
            />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
