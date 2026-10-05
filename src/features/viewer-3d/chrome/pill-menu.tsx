import { RiArrowDownSLine } from '@remixicon/react';
import { type ReactNode, useCallback, useState } from 'react';

import { useChromeDismiss } from '@/features/scan-config/components/color-by/chrome-menu';
import { mutedStyle, panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { ColorDot } from './color-dot';
import { focusChosen } from './pill-option';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

interface PillMenuProps {
  /** The muted words before what is chosen, and the menu's heading: "Colour by". */
  title: string;
  value: string;
  swatch?: string;
  testId: string;
  theme: ViewerTheme;
  /** Why the menu has no effect in the current look, where it has none: the pill is disabled and says so. */
  reason: string | null;
  /** The heading's "?". */
  help: ReactNode;
  /** The options, given the way to close the menu. */
  children(close: () => void): ReactNode;
}

/** "Colour by Section ▾", as the circuit viewer's pill: a menu over the view, under a heading. */
export function PillMenu({
  title,
  value,
  swatch,
  testId,
  theme,
  reason,
  help,
  children,
}: PillMenuProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useChromeDismiss(open, close);

  const trigger = (
    <PopoverTrigger
      data-testid={testId}
      disabled={reason !== null}
      aria-label={`${title}: ${value}`}
      style={panelStyle(theme)}
      className={cn(
        'group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold',
        'backdrop-blur-sm transition-colors hover:brightness-110 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100'
      )}
    >
      <span style={mutedStyle(theme)}>{title}</span>
      {swatch && <ColorDot color={swatch} />}
      <span>{value}</span>
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
            {title}
          </span>
          {help}
        </div>
        {children(close)}
      </PopoverContent>
    </Popover>
  );
}
