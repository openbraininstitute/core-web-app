import { RiArrowDownSLine, RiCheckLine, RiRefreshLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';

import { NEURON_HEADING } from '@/features/circuit-nodes/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import {
  MENU_HEADING_CLASS,
  MENU_INSET_CLASS,
  PILL_CLASS,
} from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import { labelForProperty } from './properties';

import type { ColorByProperty } from './types';

interface ColorByDropdownProps {
  /** currently selected property name, or null for the default (blue). */
  value: string | null;
  onChange: (property: string | null) => void;
  /** property options read from the circuit's SONATA H5 columns. */
  properties: ColorByProperty[];
  /** true while the column list is still being read from source. */
  loading?: boolean;
  /** true when the column list failed to load (worker/download error). */
  error?: boolean;
  /** retry loading the column list after an error. */
  onRetry?: () => void;
  /**
   * What colouring by no property is called, on the trigger and in the menu,
   * for a host it means something else to; "All", "All (blue)" in the menu, unless named.
   */
  noneLabel?: string;
  className?: string;
}

/**
 * "Colour by {property} ▾" selector shown at the top-right of the circuit
 * viewer, drawn as the app's other dropdowns are whatever the canvas behind it.
 */
export function ColorByDropdown({
  value,
  onChange,
  properties,
  loading,
  error,
  onRetry,
  noneLabel,
  className,
}: ColorByDropdownProps) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = value ? labelForProperty(value) : (noneLabel ?? 'All');

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
    if (!open) return;
    const onFullscreenChange = () => setOpen(false);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [open]);

  const select = (property: string | null) => {
    onChange(property);
    setOpen(false);
  };

  return (
    <Popover data-testid="color-by-dropdown" open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={triggerRef}
        id="color-by-dropdown-trigger"
        data-testid="color-by-dropdown-trigger"
        className={cn(PILL_CLASS, 'min-w-0 max-w-full', className)}
      >
        <span className="shrink-0 text-neutral-400">Colour by</span>
        <span className="truncate">{label}</span>
        <RiArrowDownSLine className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        data-testid="color-by-dropdown-content"
        id="color-by-dropdown-content"
        align="end"
        sideOffset={6}
        className="w-52 rounded-xl border-gray-100 bg-white p-1 shadow-xl ring-1 ring-black/5 backdrop-blur-xl"
      >
        <div ref={contentRef}>
          <ul
            id="color-by-dropdown-list"
            data-testid="color-by-dropdown-list"
            className="max-h-72 overflow-y-auto"
          >
            <Option
              id="color-by-dropdown-option-none"
              label={noneLabel ?? 'All (blue)'}
              selected={value === null}
              onClick={() => select(null)}
            />
            {/* The cells' own properties, headed as in the other menus. */}
            {properties.length > 0 && <li className={MENU_HEADING_CLASS}>{NEURON_HEADING}</li>}
            {properties.map((p) => (
              <Option
                id={`color-by-dropdown-option-${p.name}`}
                key={p.name}
                label={p.label}
                selected={value === p.name}
                inset
                onClick={() => select(p.name)}
              />
            ))}
            {error && properties.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-neutral-500">
                <div>Couldn&apos;t load properties.</div>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-primary-9 mt-1 inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    <RiRefreshLine className="size-3.5" />
                    Retry
                  </button>
                )}
              </li>
            ) : (
              loading &&
              properties.length === 0 && (
                <li className="px-2 py-1.5 text-sm text-neutral-500">Loading properties…</li>
              )
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
  inset = false,
  onClick,
}: {
  label: string;
  selected: boolean;
  /** Under a heading, set in from it. */
  inset?: boolean;
  onClick: () => void;
} & React.ComponentPropsWithoutRef<'button'>) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition-colors hover:bg-neutral-100',
          selected ? 'text-primary-9 font-semibold' : 'text-neutral-700',
          inset && MENU_INSET_CLASS
        )}
      >
        {label}
        {selected && <RiCheckLine className="text-primary-9 size-4" />}
      </button>
    </li>
  );
}
