'use client';

import { CarouselButtons } from '@/ui/segments/workflows/elements/carousel-buttons';
import { onSelfClick } from '@/ui/segments/workflows/elements/on-self-click';
import { cn } from '@/utils/css-class';

/** A menu's title over its cards, with the buttons that scroll them. */
export function MenuHeading({
  title,
  className,
  onBlankClick,
}: {
  title: string;
  className?: string;
  /** A click on the row itself, beside its title and buttons. */
  onBlankClick?: () => void;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a shortcut for the mouse: the keyboard has the lit card
    // biome-ignore lint/a11y/useKeyWithClickEvents: a shortcut for the mouse: the keyboard has the lit card
    <div
      className={cn('flex items-center justify-between gap-4', className)}
      onClick={onSelfClick(onBlankClick)}
    >
      <h1 className="text-neutral-3 mb-1 text-lg font-light">{title}</h1>
      <CarouselButtons />
    </div>
  );
}
