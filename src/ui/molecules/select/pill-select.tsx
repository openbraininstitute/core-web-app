'use client';

import { RiArrowDownSLine } from '@remixicon/react';

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

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
};

/** The raised white pill a PillSelect is drawn as: buttons beside one wear it too. */
export const PILL_CLASS = cn(
  // The height the select's trigger takes, so a button beside one stands as tall.
  'inline-flex h-9 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none',
  'bg-white text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-50'
);

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
}: {
  label: string;
  /** Over the pill, for a label that is short for something longer. */
  title?: string;
  value: string;
  options: PillSelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const chosen = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        title={title}
        className={cn(PILL_CLASS, 'h-auto min-w-0 max-w-full border-0', className)}
        icon={<RiArrowDownSLine className="size-4 shrink-0 opacity-100" />}
      >
        {/* Left out where the value says what it is. */}
        {label && <span className="shrink-0 text-neutral-400">{label}</span>}
        {chosen?.color && <Dot color={chosen.color} />}
        <span className="truncate">{chosen?.label ?? '—'}</span>
        {chosen?.tag && <Tag>{chosen.tag}</Tag>}
      </SelectTrigger>
      <SelectContent className="rounded-xl border-gray-100 p-1 shadow-xl backdrop-blur-xl">
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            className="rounded-xl text-sm data-[state=checked]:font-semibold"
          >
            {o.color && <Dot color={o.color} />}
            {o.label}
            {o.tag && <Tag className="ml-auto">{o.tag}</Tag>}
            {o.detail && <span className="ml-auto pl-3 text-xs text-neutral-400">{o.detail}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
