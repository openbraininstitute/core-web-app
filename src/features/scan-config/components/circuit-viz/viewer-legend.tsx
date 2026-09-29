'use client';

import { RiArrowDownSLine, RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useState } from 'react';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

import styles from '@/features/scan-config/components/color-by/chrome-animations.module.css';

export interface IViewerLegendEntry {
  /** What a toggle reports, and the row's React key. */
  key: string;
  label: string;
  color: string;
  /** Muted text after the label, e.g. a count. */
  detail?: string;
}

/**
 * A key for markers drawn over the viewer, one row per entry, each row showing or hiding its own
 * markers.
 *
 * Wears the colour-by dropdown's glass pill, and opens downward from it. Collapses rather than
 * closes: hiding an entry is reversible only from here, so a control that took the legend away
 * for good could take the markers with it.
 */
export function ViewerLegend({
  title,
  icon,
  noun,
  entries,
  hidden,
  onToggle,
  theme,
}: {
  title: string;
  /** Drawn at `size-4` before the title. */
  icon: ReactNode;
  /** Plural name of what a row draws, for the toggles' accessible names. */
  noun: string;
  entries: readonly IViewerLegendEntry[];
  hidden?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
  /** Background-derived theme (adaptive mode); null keeps the fixed light styling. */
  theme?: ViewerTheme | null;
}) {
  const [open, setOpen] = useState(true);

  if (entries.length === 0) return null;

  const panelStyle = theme
    ? {
        background: theme.panelBackground,
        color: theme.foreground,
        boxShadow: `0 0 0 1px ${theme.panelRing}`,
      }
    : undefined;
  const mutedStyle = theme ? { color: theme.mutedForeground } : undefined;
  const hoverClass = theme
    ? theme.isDark
      ? 'hover:bg-white/15'
      : 'hover:bg-black/6'
    : 'hover:bg-neutral-100';

  return (
    <aside
      aria-label={title}
      style={panelStyle}
      className={cn(
        'pointer-events-auto flex flex-col backdrop-blur-sm transition-[border-radius]',
        open ? 'rounded-xl p-1' : 'rounded-full',
        !theme && 'bg-white text-primary-9 shadow-md ring-1 ring-black/5'
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          styles.legendToggle,
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2',
          hoverClass
        )}
      >
        <span aria-hidden className="inline-flex size-4 shrink-0 [&>svg]:size-4">
          {icon}
        </span>
        <span className="mr-auto whitespace-nowrap">{title}</span>
        <RiArrowDownSLine
          aria-hidden
          className={cn(
            styles.chevronIcon,
            'size-4 shrink-0',
            open && styles.chevronIconOpen,
            !theme && 'text-neutral-400'
          )}
          style={mutedStyle}
        />
      </button>
      {open && (
        <ul className={cn(styles.panelReveal, 'flex flex-col gap-0.5 px-2 pt-0.5 pb-1.5')}>
          {entries.map(({ key, label, color, detail }) => {
            const isHidden = hidden?.has(key) ?? false;
            const EyeIcon = isHidden ? RiEyeOffLine : RiEyeLine;
            return (
              <li key={key} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    'size-2.5 shrink-0 rounded-full ring-1 ring-black/10',
                    isHidden && 'opacity-30'
                  )}
                  style={{ backgroundColor: color }}
                />
                <span
                  className={cn(
                    'mr-auto text-xs font-medium whitespace-nowrap',
                    isHidden && 'opacity-50'
                  )}
                >
                  {label}
                  {detail && (
                    <span
                      className={cn(
                        'ml-1.5 font-normal tabular-nums',
                        !theme && 'text-neutral-400'
                      )}
                      style={mutedStyle}
                    >
                      {detail}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  aria-label={`${isHidden ? 'Show' : 'Hide'} ${label} ${noun}`}
                  aria-pressed={isHidden}
                  onClick={() => onToggle?.(key)}
                  className={cn(
                    'inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2',
                    hoverClass
                  )}
                  style={mutedStyle}
                >
                  <EyeIcon className={cn('size-3.5', !theme && 'text-neutral-500')} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
