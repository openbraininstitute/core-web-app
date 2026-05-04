import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';

import { useFlags } from '@/features/feature-flags';
import { Carousel, CarouselContent, CarouselItem } from '@/ui/molecules/carousel';
import {
  listWorkflows,
  WorkflowListContextDict,
  WorkflowListSortDict,
} from '@/ui/segments/workflows/config';
import { CarouselButtons } from '@/ui/segments/workflows/elements/carousel-buttons';
import { MenuItem } from '@/ui/segments/workflows/elements/menu-item';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/config';

export function TypesMenu({
  current,
  category,
  onItemClick,
}: {
  current: TExtendedEntitiesTypeDict | null;
  category: TActivityValue | null;
  onItemClick: (v: TExtendedEntitiesTypeDict | null) => void;
}) {
  const featureFlags = useFlags();

  if (!category) return null;
  const options = listWorkflows({
    activity: category,
    flags: featureFlags,
    context: WorkflowListContextDict.Configure,
    sort: WorkflowListSortDict.Order,
  });

  return (
    <Carousel
      key={`workflow-types-menu-${category}`}
      id={`workflow-types-menu-${category}`}
      data-testid={`workflow-types-menu-${category}`}
      opts={{
        align: 'start',
        containScroll: 'trimSnaps',
        slidesToScroll: 2,
        skipSnaps: true,
        loop: false,
      }}
      className="relative py-2"
      plugins={[WheelGesturesPlugin()]}
    >
      <div className="relative py-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-neutral-3 mb-1 text-lg font-light">Type</h1>
          <CarouselButtons />
        </div>
      </div>
      <CarouselContent className="items-stretch">
        {options.map(({ targetType, disabled, entity, label }) => {
          return (
            <CarouselItem
              key={`type-selector-${entity.group}-${label}`}
              className="w-max basis-1/2 py-2 md:basis-1/3! lg:basis-1/5! 2xl:basis-1/6!"
            >
              <MenuItem<TExtendedEntitiesTypeDict | null>
                group={entity.group}
                active={current === targetType}
                value={targetType ?? null}
                disabled={disabled}
                title={label}
                onClick={onItemClick}
              />
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
