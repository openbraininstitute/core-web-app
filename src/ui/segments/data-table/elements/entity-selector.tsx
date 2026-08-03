'use client';

import { useMemo } from 'react';

import { Badge } from '@/ui/molecules/badge';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/molecules/select';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type EntityTypeSelectorOption = {
  label: string;
  value: TExtendedEntitiesTypeDict;
  count?: number;
};

export type EntityTypeSelectorProps = {
  options: readonly EntityTypeSelectorOption[];
  value: TExtendedEntitiesTypeDict;
  onSelect: (value: TExtendedEntitiesTypeDict) => void;
  /**
   * TOOLBAR SIZING — 40px instead of the default 48px trigger, to sit level with the
   * other controls in the data-grid toolbar (search pill, scope tabs, region banner,
   * toolbar buttons — all h-10). Opt-in: the legacy table tools keep the taller
   * original. The count badge is 28px and unaffected either way.
   */
  compact?: boolean;
};

function EntityTypeCountBadge({
  count,
  className,
  shrink = true,
}: {
  count: number;
  className?: string;
  /** `false` beside a truncating label, so the count is never the thing that gives way */
  shrink?: boolean;
}) {
  return (
    <Badge
      rounded
      variant="default"
      className={cn(
        'border-transparent bg-primary-8 h-7 min-w-7 px-2.5 py-1 text-sm font-bold text-white',
        !shrink && 'shrink-0',
        className
      )}
    >
      {count}
    </Badge>
  );
}

export function EntityTypeSelector({
  options,
  value,
  onSelect,
  compact = false,
}: EntityTypeSelectorProps) {
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const handleValueChange = (v: TExtendedEntitiesTypeDict) => onSelect(v);
  const selectedCount = selectedOption?.count;

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger
        className={cn(
          'min-w-36 rounded-full text-primary-9! border-neutral-2 bg-white text-base shadow-none py-0! px-6 pl-2 ring-0',
          'focus-visible:ring-0',
          // BOUNDED, not content-driven: `max-w-max` let a long entity name stretch
          // the control (and with it the whole left cluster). A ceiling turns that
          // into the `truncate` below, and keeps the menu — which mirrors this width
          // — a predictable size.
          'max-w-64',
          // the trigger's OWN height — the molecule's `data-[size=default]:h-9` is
          // overridden here, so this pair is the only thing that sizes the control
          compact ? 'max-h-10! min-h-10!' : 'max-h-12! min-h-12!'
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {/* the count never gives way — it is the shortest, most scannable part */}
          {selectedCount != null ? (
            <EntityTypeCountBadge count={selectedCount} shrink={false} />
          ) : null}
          <span className="min-w-0 truncate">{selectedOption?.label ?? 'Select entity type'}</span>
        </span>
      </SelectTrigger>
      <SelectContent
        // opens from the trigger's LEFT edge and runs rightward: this control is the
        // first thing in the toolbar's left cluster, so an `end`-aligned menu hung
        // off the wrong side of it
        align="start"
        alignOffset={0}
        sideOffset={2}
        avoidCollisions
        className={cn(
          'rounded-2xl border-white bg-white shadow-xl',
          // EXACTLY the trigger's width. Radix publishes the measured trigger width as
          // `--radix-select-trigger-width` on the content; the molecule only uses it as
          // a `min-w` (so a long option can outgrow its trigger), which reads as broken
          // under a pill trigger. Same technique the grid's filter Selects use — see
          // `GRID_SELECT_CONTENT_MATCH_TRIGGER_CLASS` — rather than a hardcoded px.
          'w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width)'
        )}
      >
        {options.map(({ label, value: optionValue, count }) => {
          return (
            <SelectItem
              key={optionValue}
              value={optionValue}
              textValue={label}
              className={cn(
                'text-primary-8! text-lg font-light cursor-pointer rounded-xl gap-5',
                'data-highlighted:text-primary-7!',
                // the menu is pinned to the trigger's width, so a long option name
                // ellipses here too instead of wrapping to a second line
                'overflow-hidden [&>span]:min-w-0 [&>span]:truncate'
              )}
            >
              <EntityTypeCountBadge count={count ?? 0} shrink={false} className="ml-auto mr-0.5" />
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
