'use client';

import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';

import { useFlags } from '@/features/feature-flags';
import { Carousel, CarouselContent, CarouselItem } from '@/ui/molecules/carousel';
import { listActivities } from '@/ui/segments/workflows/config';
import { MenuHeading } from '@/ui/segments/workflows/elements/menu-heading';
import { MenuItem } from '@/ui/segments/workflows/elements/menu-item';
import { onSelfClick } from '@/ui/segments/workflows/elements/on-self-click';

import type { TActivityValue } from '@/ui/segments/workflows/config';

type Props = {
  current: TActivityValue | null;
  onItemClick: (v: TActivityValue | null) => void;
  /** A click on the menu itself, between and around its cards. */
  onBlankClick?: () => void;
};

export function CategoryMenu({ current, onItemClick, onBlankClick }: Props) {
  const featureFlags = useFlags();
  const onBlank = onSelfClick(onBlankClick);

  return (
    <Carousel
      id="workflow-category-menu"
      data-testid="workflow-category-menu"
      opts={{ align: 'start' }}
      className="relative py-2"
      plugins={[WheelGesturesPlugin()]}
      onClick={onBlank}
    >
      <MenuHeading title="Category" onBlankClick={onBlankClick} />
      <CarouselContent className="items-stretch" onClick={onBlank}>
        {listActivities(featureFlags).map((o) => {
          return (
            <CarouselItem
              key={`category-selector-${o.value}`}
              className="w-max basis-1/2 py-2 md:basis-1/3! lg:basis-1/5! 2xl:basis-1/6!"
              onClick={onBlank}
            >
              <MenuItem<TActivityValue | null>
                testId={`workflow-category-${o.value}`}
                disabled={Boolean(o.disabled)}
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
