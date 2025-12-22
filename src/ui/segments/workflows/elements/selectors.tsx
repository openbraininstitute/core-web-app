import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  ActivityDict,
  getDropdownOptionsByCategory,
} from '@/ui/segments/workflows/elements/helpers';
import { cn } from '@/utils/css-class';
import {
  SelectContent,
  SelectTrigger,
  SelectGroup,
  SelectValue,
  SelectLabel,
  SelectItem,
  Select,
} from '@/ui/molecules/select';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';
import { useFlags } from '@/features/feature-flags';

export function EntityTypeSelectScrollable({
  value,
  category,
  onSelect,
}: {
  category: TActivityValue | null;
  value: TExtendedEntitiesTypeDict | null;
  onSelect: (v: TExtendedEntitiesTypeDict | null) => void;
}) {
  const featureFlags = useFlags();
  const breakpoint = useDefaultBreakpoint();

  if (!category) return null;
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v: TExtendedEntitiesTypeDict) => onSelect(v)}
    >
      <SelectTrigger
        size={breakpoint === 'l' ? 'sm' : 'default'}
        className={cn(
          'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
          'w-[280px] max-w-max min-w-36 rounded-full border-none text-lg',
          "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold"
        )}
      >
        <SelectValue placeholder={<span className="text-base font-light!">Select a type</span>} />
      </SelectTrigger>
      <SelectContent
        className="max-h-96 rounded-lg border-white bg-white shadow-xl"
        side="bottom"
        sideOffset={3}
      >
        {getDropdownOptionsByCategory(category, featureFlags).enabledOptions.map(
          ({ group, options }) => (
            <SelectGroup key={`entity-type-group-${group}`}>
              <SelectLabel className="text-neutral-3 text-base">{group}</SelectLabel>
              {options.map(({ label, value: _value }) => (
                <SelectItem
                  key={`entity-type-${_value}`}
                  value={_value!}
                  className={cn(
                    'text-primary-9 text-lg font-bold',
                    'data-[highlighted]:text-primary-7!'
                  )}
                >
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          )
        )}
      </SelectContent>
    </Select>
  );
}

export function CategorySelectScrollable({
  value,
  onSelect,
}: {
  value: TActivityValue | null;
  onSelect: (v: TActivityValue | null) => void;
}) {
  const breakpoint = useDefaultBreakpoint();
  return (
    <Select value={value ?? undefined} onValueChange={(v: TActivityValue) => onSelect(v)}>
      <SelectTrigger
        size={breakpoint === 'l' ? 'sm' : 'default'}
        className={cn(
          'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
          'w-[280px] max-w-max min-w-36 rounded-full border-none text-lg',
          "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold"
        )}
      >
        <SelectValue
          placeholder={<span className="text-base font-light!">Select a category</span>}
        />
      </SelectTrigger>
      <SelectContent
        className="max-h-96 rounded-lg border-white bg-white shadow-xl"
        side="bottom"
        sideOffset={3}
      >
        {ActivityDict.filter((o) => !o.disabled).map(({ label, value: _value }) => (
          <SelectItem
            key={`category-${_value}`}
            value={_value}
            className={cn('text-primary-9 text-lg font-bold', 'data-[highlighted]:text-primary-7!')}
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
