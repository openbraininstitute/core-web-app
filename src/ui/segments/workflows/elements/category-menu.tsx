'use client';

import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';

import { Carousel, CarouselContent, CarouselItem } from '@/ui/molecules/carousel';
import { CarouselButtons } from '@/ui/segments/workflows/elements/carousel-buttons';
import { CategoryDict } from '@/ui/segments/workflows/elements/helpers';
import { MenuItem } from '@/ui/segments/workflows/elements/menu-item';

import type { TCategoryValue } from '@/ui/segments/workflows/elements/helpers';

type Props = {
  current: TCategoryValue | undefined;
  onItemClick: (v: TCategoryValue | undefined) => void;
};

export function CategoryMenu({ current, onItemClick }: Props) {
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
        {CategoryDict.map((o) => (
          <CarouselItem
            key={`category-selector-${o.value}`}
            className="w-max basis-1/2 py-2 md:basis-1/3! lg:basis-1/4! xl:basis-1/5! 2xl:basis-1/6!"
          >
            <MenuItem<TCategoryValue | undefined>
              disabled={o.disabled}
              active={current === o.value}
              title={o.label}
              value={o.value}
              onClick={onItemClick}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
