'use client';

import { useState } from 'react';

import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import {
  getScaleArray,
  getScaleAvailableActivities,
} from '@/ui/segments/project/activities/elements/helpers';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

type Props = {
  onScaleChange: (s: TExtendedEntitiesTypeDict) => void;
  onTypeChange: (t: TActivityValue) => void;
  onPageChange: (p: number) => void;
  showTitle?: boolean;
};

export function Header({ onScaleChange, onTypeChange, onPageChange, showTitle = true }: Props) {
  const breakpoint = useDefaultBreakpoint();
  const scaleOptions = getScaleArray();
  const defaultScale = scaleOptions.at(0)?.value;
  const defaultActivities = defaultScale ? getScaleAvailableActivities(defaultScale) : [];

  const [selectedScale, setSelectedScale] = useState<TExtendedEntitiesTypeDict | undefined>(
    defaultScale
  );
  const [activities, setActivities] =
    useState<Array<{ label: string; value: string }>>(defaultActivities);
  const [selectedActivityType, setSelectedActivityType] = useState<TActivityValue | undefined>(
    defaultActivities.at(0)?.value
  );

  const onScale = (s: TExtendedEntitiesTypeDict) => {
    const availableActivities = getScaleAvailableActivities(s);
    const firstActivityType = availableActivities.at(0)?.value;

    setSelectedScale(s);
    onScaleChange(s);
    setActivities(availableActivities);
    setSelectedActivityType(firstActivityType);
    if (firstActivityType) {
      onTypeChange(firstActivityType);
    }
    onPageChange(1);
  };

  const onType = (t: TActivityValue) => {
    setSelectedActivityType(t);
    onTypeChange(t);
    onPageChange(1);
  };

  const triggerClassName = cn(
    'focus-visible:ring-neutral-2 bg-transparent shadow-none focus-visible:shadow-none focus-visible:ring-1',
    'max-w-max min-w-36 rounded-full border border-gray-300 text-lg cursor-pointer',
    "[&>span[data-slot='select-value']]:text-primary-9 [&>span[data-slot='select-value']]:font-bold"
  );

  const itemClassName = cn(
    'text-primary-9 text-lg font-bold cursor-pointer',
    'data-highlighted:text-primary-7!'
  );

  return (
    <div className="flex w-full flex-col items-start justify-start gap-1.5 lg:flex-row lg:gap-5 xl:items-center xl:gap-10">
      {showTitle && <h1 className="min-w-max grow text-xl">Recent activities</h1>}
      <div className="flex w-full flex-wrap items-center justify-start gap-3 lg:justify-end xl:justify-end">
        <div className="flex flex-col items-start justify-start gap-0.5 xl:flex-row xl:items-center xl:justify-center xl:gap-3">
          <div>Scale</div>
          <Select
            value={selectedScale ?? undefined}
            onValueChange={(v: TExtendedEntitiesTypeDict) => onScale(v)}
          >
            <SelectTrigger
              size={breakpoint === 'l' ? 'sm' : 'default'}
              className={cn(triggerClassName, 'w-[200px]')}
            >
              <SelectValue
                placeholder={<span className="text-base font-light!">Select a scale</span>}
              />
            </SelectTrigger>
            <SelectContent
              className="max-h-96 rounded-lg border-white bg-white shadow-xl z-9999"
              side="bottom"
              sideOffset={3}
            >
              {scaleOptions.map(({ label, value }) => (
                <SelectItem key={`scale-${value}`} value={value} className={itemClassName}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col items-start justify-start gap-0.5 xl:flex-row xl:items-center xl:justify-center xl:gap-3">
          <div>Activity type</div>
          <Select
            value={selectedActivityType ?? undefined}
            onValueChange={(v: TActivityValue) => onType(v)}
          >
            <SelectTrigger
              size={breakpoint === 'l' ? 'sm' : 'default'}
              className={cn(triggerClassName, 'w-[160px]')}
            >
              <SelectValue
                placeholder={<span className="text-base font-light!">Select a type</span>}
              />
            </SelectTrigger>
            <SelectContent
              className="max-h-96 rounded-lg border-white bg-white shadow-xl z-9999"
              side="bottom"
              sideOffset={3}
            >
              {activities.map(({ label, value }) => (
                <SelectItem key={`activity-${value}`} value={value} className={itemClassName}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
