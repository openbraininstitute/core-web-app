import { RiAlertLine, RiLoader4Line } from '@remixicon/react';

import { panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { cn } from '@/utils/css-class';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

/** A line of status over the view, top-centre: work under way, or a warning. */
export function StatusPill({
  text,
  failed,
  theme,
}: {
  text: string;
  failed: boolean;
  theme: ViewerTheme;
}) {
  return (
    <div className="absolute top-3 left-1/2 flex max-w-[calc(100%-24rem)] -translate-x-1/2 justify-center">
      <div
        role="status"
        className="flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs tabular-nums backdrop-blur-sm"
        style={{
          ...panelStyle(theme),
          ...(failed && { boxShadow: '0 0 0 1px var(--color-warning)' }),
        }}
      >
        {failed ? (
          <RiAlertLine aria-hidden className="size-4 shrink-0 text-warning" />
        ) : (
          <RiLoader4Line aria-hidden className="size-4 shrink-0 animate-spin" />
        )}
        <span className="truncate">{text}</span>
      </div>
    </div>
  );
}

/** Why there is nothing to view, in the middle of it. */
export function StatusAlert({
  title,
  message,
  theme,
}: {
  title: string;
  message: string;
  theme: ViewerTheme;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div
        role="alert"
        className="pointer-events-auto flex max-w-md flex-col items-center gap-1 rounded-xl px-4 py-3 text-center text-sm"
        style={panelStyle(theme)}
      >
        <span className="font-semibold">{title}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

/** Outside fullscreen a plain wheel scrolls the page: said for a while when one turns over the view. */
export function WheelHint({ visible, theme }: { visible: boolean; theme: ViewerTheme }) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-xs backdrop-blur-sm transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={panelStyle(theme)}
    >
      Hold <Key>Ctrl</Key> + <Key>scroll</Key> to zoom
    </div>
  );
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-current/25 px-1 py-px font-sans font-semibold">
      {children}
    </kbd>
  );
}
