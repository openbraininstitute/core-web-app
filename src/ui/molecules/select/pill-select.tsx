'use client';

import { RiArrowDownSLine } from '@remixicon/react';
import { Children } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export type PillSelectOption = {
  value: string;
  label: string;
  /** A dot before the label, such as a status colour. */
  color?: string;
  /** Muted after the label, saying what the colour means. */
  detail?: string;
  /** A tag after the label, on the pill too, saying what kind of thing it names. */
  tag?: string;
  disabled?: boolean;
  /** The heading it is listed under, with the options next to it that share it, such as Spiking. */
  heading?: string;
};

/** A heading over a run of a menu's options: a tinted band in bold capitals, which the options sit in from. */
export const MENU_HEADING_CLASS =
  'mt-1 mb-0.5 rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-bold tracking-wider text-primary-9 uppercase';
/** An option under a heading, set in from it. */
export const MENU_INSET_CLASS = 'pl-5';

/** The raised white pill a PillSelect is drawn as: buttons beside one wear it too. */
export const PILL_CLASS = cn(
  // The height the select's trigger takes, so a button beside one stands as tall.
  'inline-flex h-9 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none',
  'bg-white text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-50'
);

/** The same pill made round, for a button that is an icon alone, as tall as the pills beside it. */
export const ROUND_PILL_CLASS = cn(PILL_CLASS, 'size-9 shrink-0 justify-center px-0 py-0');

/** A PillSelect that is a part of a PillGroup: no pill of its own, its hover a band inside the group's. */
const SEGMENT_CLASS =
  'h-7 min-w-0 max-w-full gap-1 rounded-full border-0 bg-transparent px-2.5 py-0 font-semibold text-primary-9 shadow-none transition-colors hover:bg-neutral-100 data-[size=default]:h-7';

/**
 * PillSelects joined on one pill, a rule between each: one control with a
 * menu per part, such as a simulation's coordinates in its scan. Each part is
 * a PillSelect with `segment` set, and `color` a dot first that stands for
 * what they pick together.
 */
export function PillGroup({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div className={cn(PILL_CLASS, 'min-w-0 gap-0 p-1 hover:bg-white')}>
      {color && (
        <span className="ml-2 mr-0.5 flex shrink-0">
          <Dot color={color} />
        </span>
      )}
      {Children.map(children, (child, index) => (
        <>
          {index > 0 && <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-neutral-200" />}
          {child}
        </>
      ))}
    </div>
  );
}

/**
 * Two or more choices on one pill, the chosen one filled: a switch with the
 * dropdowns' look, such as All | Spiking.
 */
export function PillToggle<Value extends string | boolean>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: Value; label: string; title?: string }[];
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
}) {
  return (
    <div className={cn(PILL_CLASS, 'shrink-0 gap-0.5 p-1 hover:bg-white', className)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-full cursor-pointer rounded-full px-3 transition-colors',
            value === option.value
              ? 'bg-primary-9 text-white'
              : 'text-primary-9 hover:bg-neutral-100'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A labelled pill select: the muted label, then what is chosen, on a raised white pill. */
export function PillSelect({
  label,
  value,
  options,
  onChange,
  title,
  className,
  segment = false,
}: {
  label: string;
  /** Over the pill, for a label that is short for something longer. */
  title?: string;
  value: string;
  options: PillSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  /** A part of a PillGroup, whose own dot stands for the chosen one's. */
  segment?: boolean;
}) {
  const chosen = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        title={title}
        className={cn(
          segment ? SEGMENT_CLASS : cn(PILL_CLASS, 'h-auto min-w-0 max-w-full border-0'),
          className
        )}
        icon={<RiArrowDownSLine className="size-4 shrink-0 opacity-100" />}
      >
        {/* Left out where the value says what it is. */}
        {label && <span className="shrink-0 text-neutral-400">{label}</span>}
        {chosen?.color && !segment && <Dot color={chosen.color} />}
        <span className="truncate">{chosen?.label ?? '—'}</span>
        {chosen?.tag && <Tag>{chosen.tag}</Tag>}
      </SelectTrigger>
      <SelectContent className="rounded-xl border-gray-100 p-1 shadow-xl backdrop-blur-xl">
        {headedRuns(options).map(({ heading, items }) =>
          heading ? (
            <SelectGroup key={`${heading}:${items[0].value}`}>
              <SelectLabel className={MENU_HEADING_CLASS}>{heading}</SelectLabel>
              {items.map((o) => menuItem(o, true))}
            </SelectGroup>
          ) : (
            items.map((o) => menuItem(o, false))
          )
        )}
      </SelectContent>
    </Select>
  );
}

function menuItem(o: PillSelectOption, inset: boolean) {
  return (
    <SelectItem
      key={o.value}
      value={o.value}
      disabled={o.disabled}
      className={cn(
        'rounded-xl text-sm data-[state=checked]:font-semibold',
        inset && MENU_INSET_CLASS
      )}
    >
      {o.color && <Dot color={o.color} />}
      {o.label}
      {o.tag && <Tag className="ml-auto">{o.tag}</Tag>}
      {o.detail && <span className="ml-auto pl-3 text-xs text-neutral-400">{o.detail}</span>}
    </SelectItem>
  );
}

/** The options in runs that share a heading, in the order given; those without one stand under none. */
function headedRuns(options: PillSelectOption[]) {
  const runs: { heading?: string; items: PillSelectOption[] }[] = [];
  for (const option of options) {
    const last = runs.at(-1);
    if (last && last.heading === option.heading) last.items.push(option);
    else runs.push({ heading: option.heading, items: [option] });
  }
  return runs;
}

/** The files column's kind of tag, small: grey, rounded, in capitals. */
function Tag({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full bg-[oklch(0.929_0.013_255.508)] px-2 py-0.5 text-[10px] font-medium text-neutral-500 uppercase',
        className
      )}
    >
      {children}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />
  );
}
