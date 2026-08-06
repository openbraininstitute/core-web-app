import { type TViewVariant, ViewVariant } from '@/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** One choice, as data. */
export type TEphysSelectItem = {
  value: string;
  label: ReactNode;
  /** Native tooltip, for values the box has to truncate. Defaults to `label` when it is a string. */
  title?: string;
};

/**
 * Where the viewer is being shown, which is what decides the control row's layout.
 *
 * - `page` — a trace detail page: fixed-width boxes, all controls on one wrapping row.
 * - `panel` — embedded in app chrome and narrow: selects share the width evenly, with the sweep
 *   swatches on their own row.
 */
export type TEphysControlsVariant = 'page' | 'panel';

/**
 * The one select box the ephys viewer uses — protocol, repetition, cell, stimulus, and whatever
 * a host injects beside them.
 *
 * Built on the app's own {@link Select} rather than antd's so the viewer's controls belong to the
 * same design system as the chrome around them; a single component means the six of them cannot
 * drift apart. Only the box lives here: callers own their label, because the overview writes
 * "Select cell (4 available)" where the detail row writes "Cell".
 */
export function EphysSelect({
  id,
  value,
  onChange,
  items,
  placeholder = 'Please select',
  disabled,
  variant = ViewVariant.Light,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  items: TEphysSelectItem[];
  placeholder?: string;
  disabled?: boolean;
  variant?: TViewVariant;
  className?: string;
}) {
  const isDark = variant === ViewVariant.Default;

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className={cn(
          // `lg`: taller than the app default, and rounded to match the cards it sits among
          'h-11 overflow-hidden rounded-lg data-[size=default]:h-11',
          'text-primary-8 font-bold',
          '[&>span]:min-w-0 [&>span]:truncate',
          isDark
            ? 'border-white/35 bg-transparent text-white [&_svg]:text-white/70'
            : 'border-gray-100 bg-white',
          className
        )}
      >
        <SelectValue placeholder={placeholder} className="text-primary-8 font-bold" />
      </SelectTrigger>

      {/* the popup portals onto the page background, so it stays light in both variants */}
      <SelectContent className="border-gray-100 bg-white shadow-lg">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            title={item.title ?? (typeof item.label === 'string' ? item.label : undefined)}
            className="data-[state=checked]:font-bold data-[state=checked]:text-primary-8 cursor-pointer "
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
