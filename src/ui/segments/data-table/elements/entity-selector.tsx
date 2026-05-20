'use client';

import { Badge } from '@/ui/molecules/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
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

export function EntityTypeSelector({ options, value, onSelect }: EntityTypeSelectorProps) {
  return (
    <Select onValueChange={(v) => onSelect(v as TExtendedEntitiesTypeDict)} value={value}>
      <SelectTrigger className="max-w-max min-w-36 max-h-12! min-h-12! rounded-full border-neutral-2 bg-white text-lg shadow-none py-0! px-6">
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        align="end"
        alignOffset={0}
        sideOffset={2}
        avoidCollisions
        className="rounded-2xl border-white bg-white shadow-xl"
      >
        {options.map(({ label, value: optionValue, count = 0 }) => (
          <SelectItem
            key={optionValue}
            value={optionValue}
            className={cn(
              'text-primary-8! text-lg font-bold cursor-pointer rounded-xl',
              '[&>span:nth-child(2)]:flex [&>span:nth-child(2)]:w-full [&>span:nth-child(2)]:items-center [&>span:nth-child(2)]:justify-between [&>span:nth-child(2)]:gap-3'
            )}
          >
            <span className="text-primary-8! text-lg font-bold">{label}</span>
            {count > 0 ? (
              <Badge rounded variant="default" className="px-2.5 py-1 justify-center bg-primary-8">
                {count}
              </Badge>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
