'use client';

import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from '@/ui/molecules/button';
import { useCarousel } from '@/ui/molecules/carousel';
import { cn } from '@/utils/css-class';

export function CarouselButtons() {
  const { scrollNext, scrollPrev, canScrollNext, canScrollPrev } = useCarousel();
  if (!canScrollNext && !canScrollPrev) return null;
  return (
    <div className="flex items-center justify-center gap-0.5">
      <Button
        rounded
        variant="icon"
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        className={cn(
          'bg-neutral-2/40 hover:bg-primary-9 text-primary-9 disabled:bg-neutral-1 h-8 w-8 hover:text-white disabled:text-gray-400'
        )}
      >
        <LeftOutlined />
        <span className="sr-only">Prev category</span>
      </Button>
      <Button
        rounded
        variant="icon"
        disabled={!canScrollNext}
        className={cn(
          'bg-neutral-2/40 hover:bg-primary-9 text-primary-9 disabled:bg-neutral-1 h-8 w-8 hover:text-white disabled:text-gray-400'
        )}
        onClick={scrollNext}
      >
        <RightOutlined />
        <span className="sr-only">Next category</span>
      </Button>
    </div>
  );
}
