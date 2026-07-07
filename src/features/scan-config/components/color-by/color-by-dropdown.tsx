import { RiArrowDownSLine, RiCheckLine, RiRefreshLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import { labelForProperty } from './properties';

import type { ViewerTheme } from './contrast';
import type { ColorByProperty } from './types';

import styles from './chrome-animations.module.css';

interface ColorByDropdownProps {
  /** currently selected property name, or null for the default (blue). */
  value: string | null;
  onChange: (property: string | null) => void;
  /** property options read from the circuit's SONATA H5 columns. */
  properties: ColorByProperty[];
  /** true while the column list is still being read from source. */
  loading?: boolean;
  /** background-derived theme (adaptive mode); null → fixed light styling. */
  theme?: ViewerTheme | null;
  /** portal target for the popover (fullscreen element); null → document.body. */
  container?: HTMLElement | null;
  className?: string;
}

/** "by {property} ▾" selector shown at the top-right of the circuit viewer. */
export function ColorByDropdown({
  value,
  onChange,
  properties,
  loading,
  theme,
  container,
  className,
}: ColorByDropdownProps) {
  const [open, setOpen] = useState(false);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const prevValue = useRef(value);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = value ? labelForProperty(value) : 'None';

  useEffect(() => {
    if (prevValue.current !== value && value !== null) setRefreshSpin(true);
    prevValue.current = value;
  }, [value]);

  useEffect(() => {
    if (!open) return;
    // capture phase so a click on the WebGL canvas (which may stop propagation)
    // still closes the dropdown.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  useEffect(() => {
    const onFullscreenChange = () => setOpen(false);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const select = (property: string | null) => {
    onChange(property);
    setOpen(false);
  };

  const panelStyle = theme
    ? {
        background: theme.panelBackground,
        color: theme.foreground,
        boxShadow: `0 0 0 1px ${theme.panelRing}`,
      }
    : undefined;
  const mutedStyle = theme ? { color: theme.mutedForeground } : undefined;

  return (
    <Popover data-testid="color-by-dropdown" open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={triggerRef}
        id="color-by-dropdown-trigger"
        data-testid="color-by-dropdown-trigger"
        style={panelStyle}
        className={cn(
          styles.trigger,
          'group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold',
          'backdrop-blur-sm transition-colors focus-visible:outline-none',
          theme
            ? 'hover:brightness-110'
            : 'bg-white text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-50',
          className
        )}
      >
        <span className={cn(!theme && 'text-neutral-400')} style={mutedStyle}>
          Colour by
        </span>
        <span>{label}</span>
        {value ? (
          <RiRefreshLine
            className={cn(
              styles.refreshIcon,
              refreshSpin && styles.refreshIconSpin,
              'size-4',
              !theme && 'text-neutral-400'
            )}
            style={mutedStyle}
            onAnimationEnd={() => setRefreshSpin(false)}
          />
        ) : (
          <RiArrowDownSLine
            className={cn('size-4', !theme && 'text-neutral-400')}
            style={mutedStyle}
          />
        )}
      </PopoverTrigger>
      <PopoverContent
        container={container}
        data-testid="color-by-dropdown-content"
        id="color-by-dropdown-content"
        align="end"
        sideOffset={6}
        style={panelStyle}
        className={cn(
          'w-52 rounded-xl border-gray-100 p-1 shadow-xl backdrop-blur-xl',
          !theme && 'bg-white ring-1 ring-black/5'
        )}
      >
        <div ref={contentRef}>
          <ul
            id="color-by-dropdown-list"
            data-testid="color-by-dropdown-list"
            className="max-h-72 overflow-y-auto"
          >
            <Option
              id="color-by-dropdown-option-none"
              label="None (blue)"
              selected={value === null}
              theme={theme}
              onClick={() => select(null)}
            />
            {properties.map((p) => (
              <Option
                id={`color-by-dropdown-option-${p.name}`}
                key={p.name}
                label={p.label}
                selected={value === p.name}
                theme={theme}
                onClick={() => select(p.name)}
              />
            ))}
            {loading && properties.length === 0 && (
              <li className="px-2 py-1.5 text-sm" style={mutedStyle}>
                Loading properties…
              </li>
            )}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Option({
  label,
  selected,
  theme,
  onClick,
}: {
  label: string;
  selected: boolean;
  theme?: ViewerTheme | null;
  onClick: () => void;
} & React.ComponentPropsWithoutRef<'button'>) {
  const hoverClass = theme
    ? theme.isDark
      ? 'hover:bg-white/15'
      : 'hover:bg-black/6'
    : 'hover:bg-neutral-100';

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors',
          hoverClass,
          selected && 'font-semibold',
          !theme && (selected ? 'text-primary-9' : 'text-neutral-700')
        )}
      >
        {label}
        {selected && <RiCheckLine className={cn('size-4', !theme && 'text-primary-9')} />}
      </button>
    </li>
  );
}
