import { RiArrowDownSLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

/**
 * Set once the checklist has opened itself, and read so it never does again.
 * Per browser rather than per circuit: the control has to be found once.
 */
export const POPULATIONS_MENU_INTRODUCED_KEY = 'obi:circuit-viewer-populations-menu:v1';

interface PopulationsMenuProps {
  /** Every population the circuit declares, in declared order. */
  populations: readonly NodePopulation[];
  /** The ones taken out of the scene, by name; the rest are drawn. */
  hidden: readonly string[];
  /** Replace the hidden set. */
  onChange: (hidden: string[]) => void;
  /** The population on show, drawn in full and listed in the nodes table. */
  selected?: string;
  /** Put another population on show. Absent where the host pins that choice. */
  onSelect?: (name: string) => void;
  /** background-derived theme (adaptive mode); null → fixed light styling. */
  theme?: ViewerTheme | null;
  /** portal target for the popover (fullscreen element); null → document.body. */
  container?: HTMLElement | null;
  /**
   * Whether the checklist may open itself, which it does once and never again
   * ({@link POPULATIONS_MENU_INTRODUCED_KEY}). The host says when, since the
   * chrome stays mounted behind the views it is not on.
   */
  autoOpen?: boolean;
  className?: string;
}

/**
 * "Populations 3 of 4 ▾": which of a circuit's populations are on screen, and
 * which of them is on show.
 *
 * Two things per row, on two targets. A checkbox draws the population or leaves
 * it out; the name puts it on show, which is a different question. The
 * population on show is the one drawn in full, coloured by property and listed
 * in the nodes table, and it may be one the user has hidden. A single row
 * that meant either depending on where the pointer landed is not something a
 * screen reader could put into words.
 *
 * A third target, `Only`, answers both at once. It is the one gesture where the
 * two answers cannot sensibly differ.
 */
export function PopulationsMenu({
  populations,
  hidden,
  onChange,
  selected,
  onSelect,
  theme,
  container,
  autoOpen = false,
  className,
}: PopulationsMenuProps) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The pill counts what is on screen without saying that the populations
  // missing from it were left out by default, or that a click brings them back.
  // The panel says so itself, once, and only where something is missing.
  //
  // Statements rather than `||` and `?.`: React Compiler will not lower a
  // conditional inside a try, and drops the whole component when it cannot.
  useEffect(() => {
    if (!autoOpen || hidden.length === 0) return;

    try {
      const storage = globalThis.localStorage;
      if (!storage) return;
      if (storage.getItem(POPULATIONS_MENU_INTRODUCED_KEY)) return;
      storage.setItem(POPULATIONS_MENU_INTRODUCED_KEY, '1');
    } catch {
      // Storage blocked or full. An introduction we cannot record is one given
      // on every visit, which is worse than none.
      return;
    }
    setOpen(true);
  }, [autoOpen, hidden.length]);

  useEffect(() => {
    if (!open) return;
    // Capture phase, so a click on the WebGL canvas still closes the menu even
    // though the canvas may stop propagation.
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
    // The panel is portalled into whichever element is fullscreen, so entering
    // or leaving fullscreen moves the ground out from under it.
    const onFullscreenChange = () => setOpen(false);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const hiddenSet = new Set(hidden);
  const shownCount = populations.filter((p) => !hiddenSet.has(p.name)).length;
  // Worth spelling out as a fraction only once something is missing; "4 of 4"
  // is a number the user has to read twice to learn nothing.
  const label =
    shownCount === populations.length
      ? `${populations.length}`
      : `${shownCount} of ${populations.length}`;

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={triggerRef}
        data-testid="populations-menu-trigger"
        style={panelStyle}
        className={cn(
          'group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold',
          'backdrop-blur-sm transition-colors focus-visible:outline-none',
          theme
            ? 'hover:brightness-110'
            : 'bg-white text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-50',
          className
        )}
      >
        <span className={cn(!theme && 'text-neutral-400')} style={mutedStyle}>
          Populations
        </span>
        <span>{label}</span>
        <RiArrowDownSLine
          className={cn(
            'size-4 transition-transform duration-300 motion-reduce:transition-none',
            open && 'rotate-180',
            !theme && 'text-neutral-400'
          )}
          style={mutedStyle}
        />
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        container={container}
        data-testid="populations-menu-content"
        onOpenAutoFocus={(event) => {
          // Radix focuses the first control, "Show all": a ring on a panel
          // that opened itself, and one Enter from putting back every
          // population the user has hidden. The panel takes the focus, so Tab
          // still walks the rows from here.
          event.preventDefault();
          contentRef.current?.focus();
        }}
        // Opens under the pill's left edge, which is the one that stays put:
        // the pill sits at the left of the chrome and grows rightward.
        align="start"
        sideOffset={6}
        style={panelStyle}
        className={cn(
          'w-64 rounded-xl border-gray-100 p-1 shadow-xl backdrop-blur-xl',
          !theme && 'bg-white ring-1 ring-black/5'
        )}
      >
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <span className="text-xs uppercase tracking-wide" style={mutedStyle}>
            Visible
          </span>
          <button
            type="button"
            data-testid="populations-menu-show-all"
            disabled={hidden.length === 0}
            onClick={() => onChange([])}
            className={cn(
              'text-sm font-medium enabled:hover:underline disabled:opacity-40',
              !theme && 'text-primary-9'
            )}
          >
            Show all
          </button>
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {populations.map((population) => {
            const { name } = population;
            const isHidden = hiddenSet.has(name);
            return (
              <li
                key={name}
                className={cn(
                  'group/row flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors',
                  hoverClass
                )}
              >
                <label className="flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={(e) =>
                      onChange(
                        e.target.checked ? hidden.filter((n) => n !== name) : [...hidden, name]
                      )
                    }
                    className="size-4 cursor-pointer accent-current"
                  />
                  <span className="sr-only">Show {name}</span>
                </label>
                {onSelect ? (
                  <button
                    type="button"
                    aria-pressed={name === selected}
                    onClick={() => onSelect(name)}
                    className={cn(
                      'min-w-0 flex-1 truncate text-left text-sm',
                      name === selected && 'font-semibold',
                      isHidden && 'opacity-50',
                      !theme && (name === selected ? 'text-primary-9' : 'text-neutral-700')
                    )}
                  >
                    {name}
                    {population.type && (
                      <span className={cn('ml-1', !theme && 'text-neutral-400')} style={mutedStyle}>
                        {population.type}
                      </span>
                    )}
                  </button>
                ) : (
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      name === selected && 'font-semibold',
                      isHidden && 'opacity-50'
                    )}
                  >
                    {name}
                  </span>
                )}
                {/* Revealed on hover so a row reads as a name and not a row of buttons.
                    Focusable throughout, or it would be a gesture only a mouse could make. */}
                <button
                  type="button"
                  aria-label={`Show only ${name}`}
                  onClick={() => {
                    onChange(populations.map((p) => p.name).filter((n) => n !== name));
                    // The one population left in the scene is the one to put
                    // on show. Leaving the selection where it was would draw
                    // the only thing on screen receded, with the nodes table
                    // listing a population that is not drawn at all. Ticking
                    // a checkbox is the other case, and stays as it was: it
                    // says which populations are drawn and nothing about
                    // which one is on show.
                    onSelect?.(name);
                  }}
                  className={cn(
                    'shrink-0 text-xs font-medium opacity-0 transition-opacity',
                    'group-hover/row:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none',
                    !theme && 'text-primary-9'
                  )}
                >
                  Only
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
