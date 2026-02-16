'use client';

import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';

import { useFlags } from '@/features/feature-flags';
import { Carousel, CarouselContent, CarouselItem } from '@/ui/molecules/carousel';
import { CarouselButtons } from '@/ui/segments/workflows/elements/carousel-buttons';
import { ActivityDict } from '@/ui/segments/workflows/elements/helpers';
import { MenuItem } from '@/ui/segments/workflows/elements/menu-item';

import type { TActivityValue } from '@/ui/segments/workflows/elements/helpers';

type Props = {
  current: TActivityValue | null;
  onItemClick: (v: TActivityValue | null) => void;
};

export function CategoryMenu({ current, onItemClick }: Props) {
  const featureFlags = useFlags();

  return (
    <Carousel
      id="workflow-category-menu"
      data-testid="workflow-category-menu"
      opts={{ align: 'start' }}
      className="relative py-2"
      plugins={[WheelGesturesPlugin()]}
    >
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-neutral-3 mb-1 text-lg font-light">Category</h1>
        <CarouselButtons />
      </div>
      <CarouselContent className="items-stretch">
        {ActivityDict.map((o) => {
          const satisfiesFeatureRequirements =
            !o.requiredFeatures || o.requiredFeatures.every((flag) => featureFlags[flag]);

          return (
            <CarouselItem
              key={`category-selector-${o.value}`}
              className="w-max basis-1/2 py-2 md:basis-1/3! lg:basis-1/5! 2xl:basis-1/6!"
            >
              <MenuItem<TActivityValue | null>
                disabled={o.disabled || !satisfiesFeatureRequirements}
                active={current === o.value}
                title={o.label}
                value={o.value as TActivityValue}
                onClick={onItemClick}
              />
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
