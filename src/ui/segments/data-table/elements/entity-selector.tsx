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
};

function EntityTypeCountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <Badge
      rounded
      variant="default"
      className={cn(
        'h-6 min-w-6 border-transparent bg-primary-9 px-2 text-xs font-bold text-white',
        className
      )}
    >
      {count}
    </Badge>
  );
}

export function EntityTypeSelector({ options, value, onSelect }: EntityTypeSelectorProps) {
  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const handleValueChange = (v: TExtendedEntitiesTypeDict) => onSelect(v);
  const selectedCount = selectedOption?.count;

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="max-w-max min-w-36 max-h-12! min-h-12! rounded-full border-neutral-2 bg-white text-lg shadow-none py-0! px-6">
        <span className="flex items-center gap-2">
          <span>{selectedOption?.label ?? 'Select entity type'}</span>
          {selectedCount != null ? <EntityTypeCountBadge count={selectedCount} /> : null}
        </span>
      </SelectTrigger>
      <SelectContent
        align="end"
        alignOffset={0}
        sideOffset={2}
        avoidCollisions
        className="rounded-2xl border-white bg-white shadow-xl"
      >
        {options.map(({ label, value: optionValue, count }) => {
          return (
            <SelectItem
              key={optionValue}
              value={optionValue}
              textValue={label}
              className={cn(
                'text-primary-8! text-lg font-bold cursor-pointer rounded-xl',
                'data-highlighted:text-primary-7!'
              )}
            >
              <EntityTypeCountBadge count={count ?? 0} className="ml-auto" />
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
