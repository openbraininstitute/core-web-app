'use client';

import { useInView } from 'react-intersection-observer';

import { PlanV2 } from '@/api/sanity/pricing/planv2';
import PlanCard from '@/ui/segments/plans/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/ui/molecules/carousel';

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

  if (sortedPlans.length === 0) {
    return null;
  }

  return (
    <>
      {/* Desktop */}
      <div className="relative hidden w-screen grid-cols-4 gap-3 px-16 lg:grid">
        {sortedPlans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </div>

      {/* Mobile and Tablet Portrait */}
      <div ref={ref} className="relative w-screen px-4 lg:hidden">
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {sortedPlans.map((plan) => (
              <CarouselItem key={plan.name} className="pl-4 basis-full md:basis-1/3">
                <PlanCard plan={plan} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {inView && (
            <>
              <CarouselPrevious className="!fixed !left-2 top-1/2 -translate-y-1/2 md:!absolute md:!left-4" />
              <CarouselNext className="!fixed !right-2 top-1/2 -translate-y-1/2 md:!absolute md:!right-4" />
            </>
          )}
        </Carousel>
      </div>
    </>
  );
}
