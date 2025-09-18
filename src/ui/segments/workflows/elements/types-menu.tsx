import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import find from 'lodash/find';

import { ActivityDict, getAllOptionsOrdered } from '@/ui/segments/workflows/elements/helpers';
import { CarouselButtons } from '@/ui/segments/workflows/elements/carousel-buttons';
import { Carousel, CarouselContent, CarouselItem } from '@/ui/molecules/carousel';
import { MenuItem } from '@/ui/segments/workflows/elements/menu-item';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

export function TypesMenu({
  current,
  category,
  onItemClick,
}: {
  current: TExtendedEntitiesTypeDict | undefined;
  category: TActivityValue | undefined;
  onItemClick: (v: TExtendedEntitiesTypeDict | undefined) => void;
}) {
  if (!category) return null;
  return (
    <Carousel
      id="workflow-category-menu"
      data-testid="workflow-category-menu"
      opts={{ align: 'start' }}
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
        {getAllOptionsOrdered(category).map(({ value, disabled, group, label }) => (
          <CarouselItem
            key={`category-selector-${value}`}
            className="w-max basis-1/2 py-2 md:basis-1/3! lg:basis-1/4! xl:basis-1/5! 2xl:basis-1/6!"
          >
            <MenuItem<TExtendedEntitiesTypeDict | undefined>
              group={group}
              active={current === value}
              value={value}
              disabled={disabled}
              title={`${label} ${find(ActivityDict, { value: category })?.name}`}
              onClick={onItemClick}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
