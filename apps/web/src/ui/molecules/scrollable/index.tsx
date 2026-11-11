'use client';

/**
 * vertically scrollable list with optional up/down arrow controls.
 * caps visible rows; arrows overlay the scroll area with a glass effect.
 */

import { RiArrowDropDownLine, RiArrowDropUpLine } from '@remixicon/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export const SCROLLABLE_LIST_DEFAULTS = {
  visibleItemCount: 5,
  itemHeightPx: 44,
  itemGapPx: 8,
  scrollEdgeThresholdPx: 1,
} as const;

export type TScrollableListConfig = {
  /** max rows visible before scrolling activates */
  visibleItemCount?: number;
  /** expected row height in px (used for viewport + scroll step sizing) */
  itemHeightPx?: number;
  /** vertical gap between rows in px */
  itemGapPx?: number;
  /** px scrolled per arrow click; defaults to `itemHeightPx + itemGapPx` */
  scrollStepPx?: number;
  /** scroll offset tolerance when deciding if up/down scrolling is available */
  scrollEdgeThresholdPx?: number;
};

function getScrollListMaxHeight({
  visibleItemCount,
  itemHeightPx,
  itemGapPx,
}: Required<Pick<TScrollableListConfig, 'visibleItemCount' | 'itemHeightPx' | 'itemGapPx'>>) {
  return visibleItemCount * itemHeightPx + (visibleItemCount - 1) * itemGapPx;
}

type TScrollEdgeShadowProps = {
  direction: 'up' | 'down';
  visible: boolean;
};

function ScrollableListEdgeShadow({ direction, visible }: TScrollEdgeShadowProps) {
  const isUp = direction === 'up';

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 z-5 h-12 transition-opacity duration-200',
        isUp
          ? 'top-0 bg-linear-to-b from-black/10 via-black/4 to-transparent rounded-t-md'
          : 'bottom-0 bg-linear-to-t from-black/10 via-black/4 to-transparent rounded-b-md',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    />
  );
}

type TScrollArrowProps = {
  direction: 'up' | 'down';
  visible: boolean;
  onClick: () => void;
};

function ScrollableListArrow({ direction, visible, onClick }: TScrollArrowProps) {
  const Icon = direction === 'up' ? RiArrowDropUpLine : RiArrowDropDownLine;
  const isUp = direction === 'up';

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 z-10 flex justify-center transition-opacity duration-200',
        isUp ? 'top-1.5' : 'bottom-1.5',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      <Button
        type="button"
        rounded
        variant="icon"
        size="sm"
        disabled={!visible}
        onClick={onClick}
        aria-label={isUp ? 'Scroll up' : 'Scroll down'}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className={cn(
          'pointer-events-auto size-8 border border-neutral-2/80 bg-white/75 text-gray-400 shadow-xs backdrop-blur-sm',
          'hover:border-gray-300 hover:bg-white/90 hover:text-primary-9',
          !visible && 'pointer-events-none'
        )}
      >
        <Icon className="size-5!" aria-hidden />
      </Button>
    </div>
  );
}

type TScrollableListProps = TScrollableListConfig & {
  itemCount: number;
  children: React.ReactNode;
  className?: string;
};

export function ScrollableList({
  itemCount,
  children,
  className,
  visibleItemCount = SCROLLABLE_LIST_DEFAULTS.visibleItemCount,
  itemHeightPx = SCROLLABLE_LIST_DEFAULTS.itemHeightPx,
  itemGapPx = SCROLLABLE_LIST_DEFAULTS.itemGapPx,
  scrollStepPx,
  scrollEdgeThresholdPx = SCROLLABLE_LIST_DEFAULTS.scrollEdgeThresholdPx,
}: TScrollableListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const resolvedScrollStepPx = scrollStepPx ?? itemHeightPx + itemGapPx;
  const scrollListMaxHeight = useMemo(
    () => getScrollListMaxHeight({ visibleItemCount, itemHeightPx, itemGapPx }),
    [itemGapPx, itemHeightPx, visibleItemCount]
  );
  const isScrollable = itemCount > visibleItemCount;

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element || !isScrollable) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    setCanScrollUp(scrollTop > scrollEdgeThresholdPx);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - scrollEdgeThresholdPx);
  }, [isScrollable, scrollEdgeThresholdPx]);

  useLayoutEffect(() => {
    updateScrollState();
  }, [updateScrollState]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    const contentElement = contentRef.current;
    if (!scrollElement) {
      return undefined;
    }

    scrollElement.addEventListener('scroll', updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scrollElement);
    if (contentElement) {
      resizeObserver.observe(contentElement);
    }

    return () => {
      scrollElement.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const scrollByDirection = (direction: 'up' | 'down') => {
    scrollRef.current?.scrollBy({
      top: direction === 'up' ? -resolvedScrollStepPx : resolvedScrollStepPx,
      behavior: 'smooth',
    });
  };

  const contentStyle = useMemo(() => ({ gap: itemGapPx }), [itemGapPx]);

  if (!isScrollable) {
    return (
      <div className={cn('flex w-full min-w-0 flex-col', className)} style={contentStyle}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <ScrollableListEdgeShadow direction="up" visible={canScrollUp} />
      <ScrollableListEdgeShadow direction="down" visible={canScrollDown} />
      <ScrollableListArrow
        direction="up"
        visible={canScrollUp}
        onClick={() => scrollByDirection('up')}
      />
      <ScrollableListArrow
        direction="down"
        visible={canScrollDown}
        onClick={() => scrollByDirection('down')}
      />

      <div
        ref={scrollRef}
        className="no-scrollbar flex w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto px-1 rounded-2xl"
        style={{ maxHeight: scrollListMaxHeight }}
      >
        <div ref={contentRef} className="flex w-full min-w-0 flex-col" style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}
