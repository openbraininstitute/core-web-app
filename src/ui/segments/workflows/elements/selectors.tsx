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
import {
  ALL_WORKFLOWS,
  type TAllWorkflows,
} from '@/ui/segments/workflows/elements/workflow-activity-all';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

/** The All entry, styled as the menus' other entries. */
const ALL_ITEM_CLASS = cn(
  'text-primary-9 text-lg font-bold cursor-pointer',
  'data-highlighted:text-primary-7!'
);

export function EntityTypeSelectScrollable({
  value,
  category,
  onSelect,
}: {
  category: TActivityValue | TAllWorkflows | null;
  value: TExtendedEntitiesTypeDict | TAllWorkflows | null;
  onSelect: (v: TExtendedEntitiesTypeDict | TAllWorkflows | null) => void;
}) {
  const featureFlags = useFlags();
  const breakpoint = useDefaultBreakpoint();

  if (!category) return null;
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v: TExtendedEntitiesTypeDict | TAllWorkflows) => onSelect(v)}
    >
      <SelectTrigger
        size={breakpoint === 'l' ? 'sm' : 'default'}
        className={cn(
          'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
          'rounded-full border-none text-lg cursor-pointer',
          "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold"
        )}
        data-testid="workflow-type-filter"
      >
        <SelectValue placeholder={<span className="text-base font-light!">Select a type</span>} />
      </SelectTrigger>
      <SelectContent
        className="z-9999 max-h-96 rounded-lg border-white bg-white shadow-xl"
        side="bottom"
        sideOffset={3}
      >
        {category === ALL_WORKFLOWS && (
          <SelectItem value={ALL_WORKFLOWS} className={ALL_ITEM_CLASS}>
            All
          </SelectItem>
        )}
        {groupWorkflowsByEntityGroup(
          listWorkflows({
            activity: category,
            flags: featureFlags,
            context: 'browse',
          }).filter((w) => !w.disabled)
        ).map(({ group, options }) => {
          return (
            <SelectGroup key={`entity-type-group-${group}`}>
              <SelectLabel className="text-neutral-3 text-base">{group}</SelectLabel>
              {/*
                This menu groups by entity group, so superseded entries sort last within their own
                group rather than at the bottom of the menu — unlike the flat carousel and Data nav.
                Weight, not opacity, marks them: see the note on `MenuItem`.
              */}
              {options.map(({ label, targetType, legacy }) => (
                <SelectItem
                  key={`entity-type-${targetType}`}
                  value={targetType}
                  className={cn(
                    'text-primary-9 text-lg',
                    'data-highlighted:text-primary-7! cursor-pointer',
                    legacy ? 'font-normal' : 'font-bold'
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
  includeAll = false,
}: {
  value: TActivityValue | TAllWorkflows | null;
  onSelect: (v: TActivityValue | TAllWorkflows | null) => void;
  /** offers All first: every workflow's runs at once, legacy ones aside */
  includeAll?: boolean;
}) {
  const featureFlags = useFlags();
  const breakpoint = useDefaultBreakpoint();
  return (
    <Select
      value={value ?? undefined}
      onValueChange={(v: TActivityValue | TAllWorkflows) => onSelect(v)}
    >
      <SelectTrigger
        size={breakpoint === 'l' ? 'sm' : 'default'}
        className={cn(
          'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
          'rounded-full border-none text-lg cursor-pointer',
          "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold"
        )}
        data-testid="workflow-category-filter"
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
        {includeAll && (
          <SelectItem value={ALL_WORKFLOWS} className={ALL_ITEM_CLASS}>
            All
          </SelectItem>
        )}
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
