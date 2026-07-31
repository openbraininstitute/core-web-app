import { useFlags } from '@/features/feature-flags';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import {
  groupWorkflowsByEntityGroup,
  listActivities,
  listWorkflows,
} from '@/ui/segments/workflows/config';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

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
          'w-80 max-w-max min-w-36 rounded-full border-none text-lg cursor-pointer',
          "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold"
        )}
      >
        <SelectValue placeholder={<span className="text-base font-light!">Select a type</span>} />
      </SelectTrigger>
      <SelectContent
        className="z-9999 max-h-96 rounded-lg border-white bg-white shadow-xl"
        side="bottom"
        sideOffset={3}
      >
        {groupWorkflowsByEntityGroup(
          listWorkflows({ activity: category, flags: featureFlags, context: 'configure' }).filter(
            (w) => !w.disabled
          )
        ).map(({ group, options }) => {
          return (
            <SelectGroup key={`entity-type-group-${group}`}>
              <SelectLabel className="text-neutral-3 text-base">{group}</SelectLabel>
              {/*
                This menu groups by entity group, so superseded entries sort last within their own
                group rather than at the bottom of the menu — unlike the flat carousel and Data nav.
              */}
              {options.map(({ label, targetType, legacy }) => (
                <SelectItem
                  key={`entity-type-${targetType}`}
                  value={targetType}
                  className={cn(
                    'text-primary-9 text-lg font-bold',
                    'data-highlighted:text-primary-7! cursor-pointer',
                    { 'opacity-60 data-highlighted:opacity-100': legacy }
                  )}
                >
                  {label}
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
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
  const featureFlags = useFlags();
  const breakpoint = useDefaultBreakpoint();
  return (
    <Select value={value ?? undefined} onValueChange={(v: TActivityValue) => onSelect(v)}>
      <SelectTrigger
        size={breakpoint === 'l' ? 'sm' : 'default'}
        className={cn(
          'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
          'w-[280px] max-w-max min-w-36 rounded-full border-none text-lg cursor-pointer',
          "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold"
        )}
      >
        <SelectValue
          placeholder={<span className="text-base font-light!">Select a category</span>}
        />
      </SelectTrigger>
      <SelectContent
        className="z-9999 max-h-96 rounded-lg border-white bg-white shadow-xl"
        side="bottom"
        sideOffset={3}
      >
        {listActivities(featureFlags).map(({ label, value: _value, disabled }) => (
          <SelectItem
            key={`category-${_value}`}
            value={_value}
            disabled={Boolean(disabled)}
            className={cn(
              'text-primary-9 text-lg font-bold cursor-pointer',
              'data-highlighted:text-primary-7!'
            )}
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
