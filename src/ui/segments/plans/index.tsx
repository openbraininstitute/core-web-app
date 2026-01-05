'use client';

import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import PlanCard from '@/ui/segments/plans/card';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/ui/molecules/carousel';
import { PlanV2 } from '@/types/virtual-lab/pricing';

export default function Plans({ plans }: { plans: PlanV2[] }) {
  const fallbackOrder = ['Free', 'Pro', 'Enterprise', 'Education'];

  const sortedPlans = [...plans].sort((a, b) => {
    if (a.planOrder != null && b.planOrder != null) {
      return a.planOrder - b.planOrder;
    }
    if (a.planOrder != null) return -1;
    if (b.planOrder != null) return 1;

    const aIndex = fallbackOrder.indexOf(a.name);
    const bIndex = fallbackOrder.indexOf(b.name);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  const { ref, inView } = useInView({
    threshold: 0.3,
    triggerOnce: false,
  });

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [visibleSlides, setVisibleSlides] = useState<number[]>([]);

  useEffect(() => {
    if (!carouselApi) return;

    const updateVisibleSlides = () => {
      const selected = carouselApi.selectedScrollSnap?.() ?? 0;
      const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
      if (isMobile) {
        setVisibleSlides([selected]);
        return;
      }
      const slides =
        // @ts-expect-error slidesInView may accept a boolean for partial visibility in Embla
        (carouselApi.slidesInView?.(true) as number[] | undefined) ?? carouselApi.slidesInView();
      setVisibleSlides(slides ?? [selected]);
    };

    updateVisibleSlides();
    carouselApi.on('select', updateVisibleSlides);
    carouselApi.on('scroll', updateVisibleSlides);
    carouselApi.on('reInit', updateVisibleSlides);

    return () => {
      carouselApi.off('select', updateVisibleSlides);
      carouselApi.off('scroll', updateVisibleSlides);
      carouselApi.off('reInit', updateVisibleSlides);
    };
  }, [carouselApi]);

  if (sortedPlans.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop */}
      <div className="relative hidden w-screen grid-cols-4 gap-3 px-16 xl:grid">
        {sortedPlans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>

      {/* Mobile and Tablet Portrait */}
      <div ref={ref} className="relative w-screen px-4 xl:hidden">
        <nav
          id="plans-navigation"
          className="mb-3 flex w-full justify-center gap-3 overflow-x-auto pb-1 xl:hidden"
        >
          {sortedPlans.map((plan, index) => {
            const isVisible = visibleSlides.includes(index);
            return (
              <span
                key={`plan-label-${plan.name}`}
                className="text-lg whitespace-nowrap"
                style={{
                  fontWeight: isVisible ? 'bold' : 'normal',
                  color: isVisible ? '#003a8c' : '#8c8c8c',
                }}
              >
                {plan.name}
              </span>
            );
          })}
        </nav>
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          setApi={setCarouselApi}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {sortedPlans.map((plan, index) => (
              <CarouselItem
                key={plan.name}
                className="basis-full pl-4 md:basis-1/3"
                data-index={index}
              >
                <PlanCard plan={plan} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {inView && (
            <>
              <CarouselPrevious className="!fixed top-1/2 !left-2 -translate-y-1/2 md:!absolute md:!left-4" />
              <CarouselNext className="!fixed top-1/2 !right-2 -translate-y-1/2 md:!absolute md:!right-4 [&>svg]:rotate-180" />
            </>
          )}
        </Carousel>
      </div>
    </>
  );
}
