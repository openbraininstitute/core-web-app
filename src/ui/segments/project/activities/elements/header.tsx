'use client';

import { ActivityAndTypeSelectors } from '@/ui/segments/workflows/elements/browse-header';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

type Props = {
  activity: TActivityValue | null;
  entityType: TExtendedEntitiesTypeDict | null;
  onActivityChange: (activity: TActivityValue | null) => void;
  onEntityTypeChange: (entityType: TExtendedEntitiesTypeDict | null) => void;
  showTitle?: boolean;
};

export function Header({
  activity,
  entityType,
  onActivityChange,
  onEntityTypeChange,
  showTitle = true,
}: Props) {
  return (
    <div className="flex w-full flex-col items-start justify-start gap-1.5 lg:flex-row lg:gap-5 xl:items-center xl:gap-10">
      {showTitle && <h1 className="min-w-max grow text-xl">Recent activities</h1>}
      <div className="flex w-full flex-wrap items-center justify-start gap-3 lg:justify-end xl:justify-end">
        <ActivityAndTypeSelectors
          activity={activity}
          entityType={entityType}
          onActivityChange={onActivityChange}
          onEntityTypeChange={onEntityTypeChange}
        />
      </div>
    </div>
  );
}
