import { RiCheckLine } from '@remixicon/react';

import { mutedStyle } from '@/features/scan-config/components/color-by/contrast';
import { cn } from '@/utils/css-class';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

/** One choice of a list, ticked while chosen. */
export function PillOption({
  label,
  detail,
  selected,
  theme,
  onClick,
}: {
  label: string;
  /** A second, muted line. */
  detail?: string;
  selected: boolean;
  theme: ViewerTheme;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-label={label}
        aria-description={detail}
        aria-pressed={selected}
        onClick={onClick}
        className={cn(
          'flex w-full items-start justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors',
          theme.isDark ? 'hover:bg-white/15' : 'hover:bg-black/6',
          selected && 'font-semibold'
        )}
      >
        <span className="flex min-w-0 flex-col">
          <span>{label}</span>
          {detail && (
            <span className="text-xs font-normal leading-snug" style={mutedStyle(theme)}>
              {detail}
            </span>
          )}
        </span>
        {selected && <RiCheckLine className="mt-0.5 size-4 shrink-0" />}
      </button>
    </li>
  );
}

/**
 * For a list's `onOpenAutoFocus`: the chosen option takes the focus, not the first thing in the list, which may be a
 * "?" whose card would come up with it.
 */
export function focusChosen(e: Event): void {
  e.preventDefault();
  (e.currentTarget as HTMLElement | null)
    ?.querySelector<HTMLElement>('[aria-pressed="true"]')
    ?.focus();
}
