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
  disabled?: boolean;
};

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
        className={cn(
          'inline-flex h-auto min-w-0 max-w-full items-center gap-1 rounded-full border-0 px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none',
          'bg-white text-primary-9 shadow-md ring-1 ring-black/5 hover:bg-neutral-50',
          className
        )}
        icon={<RiArrowDownSLine className="size-4 shrink-0 opacity-100" />}
      >
        {/* Left out where the value says what it is. */}
        {label && <span className="shrink-0 text-neutral-400">{label}</span>}
        {chosen?.color && <Dot color={chosen.color} />}
        <span className="truncate">{chosen?.label ?? '—'}</span>
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
            {o.detail && <span className="ml-auto pl-3 text-xs text-neutral-400">{o.detail}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: color }} />
  );
}
