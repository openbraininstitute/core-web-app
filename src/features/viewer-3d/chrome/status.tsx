import { RiAlertLine, RiInformationLine, RiLoader4Line } from '@remixicon/react';

import { panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { cn } from '@/utils/css-class';

import type { CSSProperties, ReactNode } from 'react';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

export const megabytes = (bytes: number) => (bytes / 1e6).toFixed(1);

const ICONS = {
  busy: <RiLoader4Line aria-hidden className="size-4 shrink-0 animate-spin" />,
  warning: <RiAlertLine aria-hidden className="size-4 shrink-0 text-warning" />,
  info: <RiInformationLine aria-hidden className="size-4 shrink-0 opacity-70" />,
};

/**
 * Status over the view, top-centre unless placed: work under way, a warning or a note, with what can be done about
 * it. `detail` follows the text on screen but is hidden from screen readers, so progress that changes often is not
 * announced each time.
 */
export function StatusPill({
  text,
  detail,
  kind,
  theme,
  place,
  children,
}: {
  text: string;
  detail?: string;
  kind: keyof typeof ICONS;
  theme: ViewerTheme;
  place?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'absolute flex',
        !place && 'top-3 left-1/2 max-w-[calc(100%-24rem)] -translate-x-1/2 justify-center'
      )}
      style={place}
    >
      <div
        role="status"
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs tabular-nums backdrop-blur-sm',
          children && 'pointer-events-auto py-1 pr-1'
        )}
        style={{
          ...panelStyle(theme),
          ...(kind === 'warning' && { boxShadow: '0 0 0 1px var(--color-warning)' }),
        }}
      >
        {ICONS[kind]}
        <span className="truncate">
          {text}
          {detail && <span aria-hidden> {detail}</span>}
        </span>
        {children}
      </div>
    </div>
  );
}

/** Why there is nothing to view, in the middle of it, and what can be done about it. */
export function StatusAlert({
  title,
  message,
  theme,
  children,
}: {
  title: string;
  message: string;
  theme: ViewerTheme;
  children?: ReactNode;
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
        {children && <div className="mt-2 flex gap-2">{children}</div>}
      </div>
    </div>
  );
}

/** What can be done about a status, in its pill or under its alert. */
export function StatusAction({
  onClick,
  disabled,
  children,
}: {
  onClick(): void;
  disabled?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-current/30 px-3 py-1 text-xs font-medium transition-colors hover:bg-current/10 disabled:opacity-50"
    >
      {children}
    </button>
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
