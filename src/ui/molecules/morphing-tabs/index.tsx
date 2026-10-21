'use client';
// beui.dev/components/blocks/morphing-tabs — trimmed to a fixed-order rail with mounted panels

import {
  animate as animateValue,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

export type MorphingTabsItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  /** Shown on hover. Sits outside the button, so it also works while disabled. */
  tooltip?: ReactNode;
  /** E2E handle on the tab button. */
  testId?: string;
};

export type MorphingTabsClassNames = {
  root?: string;
  rail?: string;
  tab?: string;
  activeTab?: string;
  icon?: string;
  label?: string;
  railStart?: string;
  railCenter?: string;
  railEnd?: string;
  content?: string;
  panel?: string;
  tooltip?: string;
  tooltipArrow?: string;
};

export interface MorphingTabsProps {
  items: MorphingTabsItem[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string | null) => void;
  /** Which side of the rail the tabs sit on. Default `start`; `end` leaves the start free. */
  tabsAlign?: 'start' | 'end';
  /** Rail-level leading content (e.g. a breadcrumb), in the rail row above the panel's top edge. */
  railStart?: ReactNode;
  /** Rail-level content centred in the rail row. */
  railCenter?: ReactNode;
  /** Rail-level trailing content after the tabs (e.g. a close button). */
  railEnd?: ReactNode;
  ariaLabel?: string;
  className?: string;
  classNames?: MorphingTabsClassNames;
}

// The design width of a tab, and the narrowest it may shrink to before the
// label stops reading. See `tabWidth` in MorphingTabs.
const MAX_TAB_WIDTH = 232;
const MIN_TAB_WIDTH = 132;
const TAB_HEIGHT = 48;
const TAB_RADIUS = 24;
const RAIL_HEIGHT = 48;
const SURFACE_INSET = 4;
const LIQUID_JOIN = 24;
const PANEL_RADIUS = 28;
const RAIL_GAP = 16;
/** Half the hairline, so the stroke sits fully inside the clipped root. */
const SURFACE_EDGE = 0.5;
/** Critically damped: the surface glides to the active tab and never rebounds. */
const SPRING_GLIDE = { stiffness: 700, damping: 50, mass: 0.5 } as const;

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function liquidTabPath(
  tabLeft: number,
  surfaceWidth: number,
  surfaceHeight: number,
  tabWidth: number
) {
  const panelLeft = SURFACE_INSET;
  const panelRight = surfaceWidth - SURFACE_INSET;
  const panelBottom = Math.max(RAIL_HEIGHT + PANEL_RADIUS * 2, surfaceHeight - SURFACE_EDGE);
  const left = Math.max(panelLeft, Math.min(panelRight - tabWidth, tabLeft));
  const right = left + tabWidth;
  const top = Math.max(SURFACE_EDGE, RAIL_HEIGHT - TAB_HEIGHT);
  const bottom = RAIL_HEIGHT;
  const leftJoin = Math.max(panelLeft, left - LIQUID_JOIN);
  const rightJoin = Math.min(panelRight, right + LIQUID_JOIN);
  const leftDepth = Math.min(LIQUID_JOIN, left - leftJoin);
  const rightDepth = Math.min(LIQUID_JOIN, rightJoin - right);
  const leftControl = leftDepth * 0.55;
  const rightControl = rightDepth * 0.55;
  const leftPanelRadius = Math.min(PANEL_RADIUS, leftJoin - panelLeft);
  const rightPanelRadius = Math.min(PANEL_RADIUS, panelRight - rightJoin);

  return [
    `M${panelLeft} ${bottom + leftPanelRadius}`,
    `Q${panelLeft} ${bottom} ${panelLeft + leftPanelRadius} ${bottom}`,
    `H${leftJoin}`,
    `C${leftJoin + leftControl} ${bottom} ${left} ${bottom - leftDepth + leftControl} ${left} ${bottom - leftDepth}`,
    `V${top + TAB_RADIUS}`,
    `Q${left} ${top} ${left + TAB_RADIUS} ${top}`,
    `H${right - TAB_RADIUS}`,
    `Q${right} ${top} ${right} ${top + TAB_RADIUS}`,
    `V${bottom - rightDepth}`,
    `C${right} ${bottom - rightDepth + rightControl} ${rightJoin - rightControl} ${bottom} ${rightJoin} ${bottom}`,
    `H${panelRight - rightPanelRadius}`,
    `Q${panelRight} ${bottom} ${panelRight} ${bottom + rightPanelRadius}`,
    `V${panelBottom - PANEL_RADIUS}`,
    `Q${panelRight} ${panelBottom} ${panelRight - PANEL_RADIUS} ${panelBottom}`,
    `H${panelLeft + PANEL_RADIUS}`,
    `Q${panelLeft} ${panelBottom} ${panelLeft} ${panelBottom - PANEL_RADIUS}`,
    'Z',
  ].join(' ');
}

/** The panel and the notch of the active tab, as one shape that follows `left`. */
function LiquidSurface({
  left,
  surfaceWidth,
  surfaceHeight,
  tabWidth,
  className,
}: {
  left: MotionValue<number>;
  surfaceWidth: number;
  surfaceHeight: number;
  tabWidth: number;
  className?: string;
}) {
  const path = useTransform(left, (value) =>
    liquidTabPath(value, surfaceWidth, surfaceHeight, tabWidth)
  );
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${surfaceWidth} ${surfaceHeight}`}
      preserveAspectRatio="none"
      // the surface is the panel: white fill, hairline edge, under the content (z-0)
      className={cn('pointer-events-none absolute inset-0 z-0 h-full w-full text-white', className)}
    >
      <motion.path
        d={path}
        fill="currentColor"
        className="stroke-neutral-2"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function TabTooltip({
  tooltip,
  className,
  arrowClassName,
  children,
}: {
  tooltip?: ReactNode;
  className?: string;
  arrowClassName?: string;
  children: ReactNode;
}) {
  if (!tooltip) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        avoidCollisions
        side="bottom"
        sideOffset={3}
        align="start"
        className={className}
        arrowClassName={arrowClassName}
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The narrowest layout that fits: the rail cannot scroll (the surface is one continuous shape, its
 * notch has to stay over the tab that cut it), so slots shrink in this order of sacrifice:
 *   1. the design width, down to a floor where a truncated label still reads;
 *   2. the gap between slots, so the floor survives one panel narrower;
 *   3. the floor itself — a cramped tab is still tappable, a clipped one is not reachable.
 */
function fitTabs(count: number, inner: number, gap: number) {
  if (inner <= 0 || count === 0) return { tabWidth: MAX_TAB_WIDTH, slotGap: gap };
  const widthAt = (g: number) => Math.floor((inner - g * (count - 1)) / count);

  if (widthAt(gap) >= MIN_TAB_WIDTH) {
    return { tabWidth: Math.min(MAX_TAB_WIDTH, widthAt(gap)), slotGap: gap };
  }
  if (count > 1 && widthAt(0) >= MIN_TAB_WIDTH) {
    const fitted = Math.floor((inner - MIN_TAB_WIDTH * count) / (count - 1));
    return { tabWidth: MIN_TAB_WIDTH, slotGap: Math.max(0, fitted) };
  }
  return { tabWidth: Math.max(0, widthAt(0)), slotGap: 0 };
}

export function MorphingTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  tabsAlign = 'start',
  railStart,
  railCenter,
  railEnd,
  ariaLabel = 'Tabs',
  className,
  classNames,
}: MorphingTabsProps) {
  const reduce = Boolean(useReducedMotion());
  const hasEnd = Boolean(railEnd);
  const uid = useId();

  const [internalValue, setInternalValue] = useState<string | null>(
    defaultValue ?? items[0]?.id ?? null
  );
  const controlled = value !== undefined;
  const currentValue = controlled ? (value ?? null) : internalValue;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [surface, setSurface] = useState({ width: 0, height: 0, gap: 12, end: 0 });
  const [placed, setPlaced] = useState(false);
  const surfaceLeft = useMotionValue(SURFACE_INSET);

  const firstEnabledItem = items.find((item) => !item.disabled) ?? items[0] ?? null;
  const activeItem = items.find((item) => item.id === currentValue) ?? firstEnabledItem;
  const activeId = activeItem?.id ?? null;

  // the end slot takes its own width (plus a gap) off the room the tabs fit into
  const endReserve = surface.end > 0 ? surface.end + RAIL_GAP : 0;
  const { tabWidth, slotGap } = fitTabs(
    items.length,
    surface.width - SURFACE_INSET * 2 - endReserve,
    surface.gap
  );
  const tabsWidth = items.length * tabWidth + Math.max(0, items.length - 1) * slotGap;
  // tabs hug the end of the rail (before the end slot) when aligned there
  const slotStart =
    SURFACE_INSET +
    (tabsAlign === 'end'
      ? Math.max(0, surface.width - SURFACE_INSET * 2 - endReserve - tabsWidth)
      : 0);
  const slotLeft = (index: number) => slotStart + index * (tabWidth + slotGap);
  // start / centre slots stop short of the tabs when they sit at the end, so they never collide
  const railRight =
    tabsAlign === 'end' && surface.width > 0
      ? surface.width - slotStart + RAIL_GAP
      : SURFACE_INSET + endReserve;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const rail = railRef.current;
    if (!root || !rail) return;

    const measure = () => {
      const gap = Number.parseFloat(getComputedStyle(rail).columnGap);
      setSurface({
        width: root.clientWidth,
        height: root.clientHeight,
        gap: Number.isFinite(gap) ? gap : 12,
        end: hasEnd ? (endRef.current?.offsetWidth ?? 0) : 0,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    if (endRef.current) observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [hasEnd]);

  const setActive = useCallback(
    (id: string | null) => {
      if (id && items.find((item) => item.id === id)?.disabled) return;
      if (!controlled) setInternalValue(id);
      onValueChange?.(id);
    },
    [controlled, items, onValueChange]
  );

  // a value that names no tab (or none yet) falls back to the first enabled one
  useEffect(() => {
    if (firstEnabledItem && !items.some((item) => item.id === currentValue)) {
      setActive(firstEnabledItem.id);
    }
  }, [currentValue, firstEnabledItem, items, setActive]);

  const activeIndex = activeId ? items.findIndex((item) => item.id === activeId) : -1;
  const activeLeft = activeIndex < 0 ? null : slotLeft(activeIndex);

  useLayoutEffect(() => {
    if (activeLeft === null || surface.width === 0) return;
    // first measured layout: sit on the active tab instead of gliding in from the rail's start
    if (!placed) {
      surfaceLeft.set(activeLeft);
      setPlaced(true);
      return;
    }
    const controls = animateValue(surfaceLeft, activeLeft, reduce ? { duration: 0 } : SPRING_GLIDE);
    return () => controls.stop();
  }, [activeLeft, placed, reduce, surface.width, surfaceLeft]);

  const handleTabKeyDown = (index: number, event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const nextId = items[(index + direction + items.length) % items.length].id;
    setActive(nextId);
    requestAnimationFrame(() => tabButtonRefs.current[nextId]?.focus());
  };

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative isolate flex min-h-0 min-w-0 flex-col overflow-hidden bg-transparent text-[#181818]',
        classNames?.root,
        className
      )}
    >
      {placed && surface.width > SURFACE_INSET * 2 ? (
        <LiquidSurface
          left={surfaceLeft}
          surfaceWidth={surface.width}
          surfaceHeight={surface.height}
          tabWidth={tabWidth}
          className={classNames?.activeTab}
        />
      ) : null}

      <div className="relative h-12 shrink-0">
        <div
          ref={railRef}
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          className={cn('relative z-30 flex h-full gap-3 md:gap-4', classNames?.rail)}
        >
          {items.map((item, index) => {
            const isActive = item.id === activeId;

            return (
              <div
                key={item.id}
                style={{
                  zIndex: isActive ? 20 : 1,
                  transform: `translate3d(${slotLeft(index)}px, 0, 0)`,
                }}
                className={cn(
                  'group absolute top-0 left-0 flex items-stretch select-none',
                  item.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                <TabTooltip
                  tooltip={item.tooltip}
                  className={classNames?.tooltip}
                  arrowClassName={classNames?.tooltipArrow}
                >
                  <div
                    style={{ width: tabWidth, height: TAB_HEIGHT }}
                    className="relative flex items-stretch"
                  >
                    {!isActive ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-0 bottom-2 rounded-[1.25rem] bg-[oklch(0.984_0.003_247.858)] transition-colors duration-200 group-hover:bg-[oklch(0.929_0.013_255.508)]"
                      />
                    ) : null}

                    <button
                      ref={(node) => {
                        tabButtonRefs.current[item.id] = node;
                      }}
                      id={`${uid}-tab-${safeId(item.id)}`}
                      data-testid={item.testId}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`${uid}-panel`}
                      aria-disabled={item.disabled || undefined}
                      tabIndex={isActive ? 0 : -1}
                      disabled={item.disabled}
                      onClick={() => setActive(item.id)}
                      onKeyDown={(event) => handleTabKeyDown(index, event)}
                      className={cn(
                        'group relative z-10 flex h-full w-full min-w-0 items-center gap-2 overflow-hidden rounded-t-[1.5rem] px-3 text-left outline-none transition-colors',
                        isActive ? 'text-primary-8' : 'pb-2 text-neutral-4 hover:text-[#181818]',
                        item.disabled && 'cursor-not-allowed opacity-60 hover:text-neutral-4',
                        classNames?.tab
                      )}
                    >
                      {/* keyboard focus ring; open at the bottom while active so it
                          does not cut across the tab's join with the panel */}
                      <span
                        aria-hidden
                        className={cn(
                          'pointer-events-none absolute inset-x-1 top-1 opacity-0 transition-opacity group-focus-visible:opacity-100',
                          isActive
                            ? 'bottom-0 rounded-t-[1.25rem] border-x-2 border-t-2 border-black/20'
                            : 'bottom-2 rounded-[1rem] border-2 border-black/20'
                        )}
                      />
                      {item.icon ? (
                        <span
                          aria-hidden
                          className={cn(
                            'grid size-8 shrink-0 place-items-center rounded-full transition-colors',
                            isActive
                              ? 'bg-primary-8 text-white'
                              : 'bg-[oklch(0.968_0.007_247.896)] text-neutral-4',
                            classNames?.icon
                          )}
                        >
                          {item.icon}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'min-w-0 truncate whitespace-nowrap text-lg font-medium leading-[normal] tracking-[-0.01em]',
                          classNames?.label
                        )}
                      >
                        {item.label}
                      </span>
                    </button>
                  </div>
                </TabTooltip>
              </div>
            );
          })}
          {railStart || railCenter ? (
            // flex, not a fixed grid: the start slot and the centre slot both shrink
            // (min-w-0, proportionally to their content) before either can reach the tabs
            <div
              data-slot="morphing-tabs-rail-slots"
              className="pointer-events-none absolute z-30 flex items-center gap-4 overflow-hidden"
              style={{ left: SURFACE_INSET, right: railRight, top: 0, height: RAIL_HEIGHT }}
            >
              <div className={cn('flex min-w-0 [&>*]:pointer-events-auto', classNames?.railStart)}>
                {railStart}
              </div>
              {/* flex-auto grows into all the space between start and tabs (and still shrinks with start), so the capped child is centred in it */}
              <div className="flex min-w-0 flex-auto justify-center">
                <div
                  className={cn(
                    'flex min-w-0 max-w-[min(32rem,100%)] [&>*]:pointer-events-auto',
                    classNames?.railCenter
                  )}
                >
                  {railCenter}
                </div>
              </div>
            </div>
          ) : null}
          {railEnd ? (
            <div
              ref={endRef}
              data-slot="morphing-tabs-rail-end"
              className={cn('absolute z-30 flex items-center', classNames?.railEnd)}
              style={{ right: SURFACE_INSET, top: 0, height: RAIL_HEIGHT }}
            >
              {railEnd}
            </div>
          ) : null}
        </div>
      </div>

      <div
        id={`${uid}-panel`}
        role="tabpanel"
        aria-labelledby={`${uid}-tab-${safeId(activeId ?? 'empty')}`}
        className={cn(
          'relative z-20 mx-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] text-[#181818]',
          classNames?.content
        )}
      >
        {/* every panel stays mounted (editor state survives a tab switch); inactive ones hide */}
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'min-h-0 flex-1 flex-col',
              item.id === activeId ? 'flex' : 'hidden',
              classNames?.panel
            )}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
