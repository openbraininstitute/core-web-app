'use client';

import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiBookOpenLine,
  RiFootprintFill,
  RiSubtractLine,
  RiUnpinLine,
} from '@remixicon/react';
import { useAtom } from 'jotai';
import { AnimatePresence, motion, useDragControls, useMotionValue } from 'motion/react';
import Link from 'next/link';
import { Fragment, type PointerEvent, type ReactNode, useRef, useState } from 'react';

import { config } from '@/config';
import { learnPagePath } from '@/features/learn/catalogue';
import { pinnedWalkthroughAtom } from '@/features/learn/pinned-walkthrough';
import { WalkthroughStage, walkthroughClicks } from '@/features/learn/ui/walkthrough-stage';
import { WALKTHROUGHS } from '@/features/learn/walkthroughs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

/** The window's width, px, until it is dragged to another, and the least it can be. */
const WIDTH = { start: 540, least: 320 };
/** Kept between the window and the screen's edges, px. */
const EDGE = 8;

const ResizeSide = { Left: 'left', Right: 'right' } as const;
type TResizeSide = (typeof ResizeSide)[keyof typeof ResizeSide];

const HEADER_BUTTON =
  'flex size-[30px] shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white!';

function HeaderButton({
  label,
  testId,
  onClick,
  children,
}: {
  label: string;
  testId: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-testid={testId}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={HEADER_BUTTON}
    >
      {children}
    </button>
  );
}

/**
 * The pinned walkthrough, over every page of a project: a small circle on the right edge, which
 * opens into a window that floats over the page and is moved by its header.
 */
export function PinnedWalkthrough() {
  const [pinned, setPinned] = useAtom(pinnedWalkthroughAtom);
  const { virtualLabId, projectId } = useWorkspace();
  const bounds = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  // where it was left, kept while it is a circle
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const box = useRef<HTMLElement>(null);
  // while an edge is being dragged
  const [dragged, setDragged] = useState<number | null>(null);

  const walkthrough = WALKTHROUGHS.find((w) => w.id === pinned?.id);
  if (!pinned || !walkthrough) return null;

  const clicks = walkthroughClicks(walkthrough);
  const at = Math.min(Math.max(pinned.at, 0), clicks.length - 1);
  const now = clicks[at];
  const last = at === clicks.length - 1;
  const step = `Step ${now.s + 1} of ${walkthrough.steps.length}`;
  const goTo = (next: number) =>
    setPinned({ ...pinned, at: Math.min(Math.max(next, 0), clicks.length - 1) });
  const width = dragged ?? pinned.width ?? WIDTH.start;

  /** Widens or narrows it from one side, the other staying where it is; its height follows. */
  const resize = (side: TResizeSide) => (e: PointerEvent<HTMLDivElement>) => {
    const el = box.current;
    if (!el || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const from = el.getBoundingClientRect();
    const fromX = x.get();
    const ratio = walkthrough.shot.w / walkthrough.shot.h;
    const room =
      side === ResizeSide.Left ? from.right - EDGE : window.innerWidth - EDGE - from.left;
    const tall = (window.innerHeight - EDGE - from.bottom) * ratio + from.width;
    const most = Math.max(WIDTH.least, Math.min(room, tall));
    let now = from.width;
    const onMove = (move: globalThis.PointerEvent) => {
      const by = move.clientX - e.clientX;
      const wanted = from.width + (side === ResizeSide.Left ? -by : by);
      now = Math.min(Math.max(wanted, WIDTH.least), most);
      setDragged(now);
      // it hangs from its right edge, which goes along when that is the one dragged
      if (side === ResizeSide.Right) x.set(fromX + now - from.width);
    };
    const onEnd = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      setPinned((current) => current && { ...current, width: now });
      setDragged(null);
    };
    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  };
  const learn = `${learnPagePath(config.ROOT_ROUTE, virtualLabId, projectId)}?section=walkthroughs&walkthrough=${walkthrough.id}`;

  return (
    <>
      <div ref={bounds} aria-hidden className="pointer-events-none fixed inset-[8px]" />
      <AnimatePresence initial={false} mode="popLayout">
        {pinned.open ? (
          <motion.section
            key="window"
            ref={box}
            data-testid="pinned-walkthrough"
            aria-label={`Walkthrough: ${walkthrough.title}`}
            drag
            dragListener={false}
            dragControls={drag}
            dragConstraints={bounds}
            dragMomentum={false}
            dragElastic={0}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{ x, y, width, transformOrigin: 'right center' }}
            className="fixed top-[84px] right-[16px] z-[1100] flex max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_60px_-12px_rgb(0_39_102/0.4),0_0_0_1px_rgb(0_39_102/0.1)] max-md:right-[8px]"
          >
            <header
              onPointerDown={(e) => drag.start(e)}
              className="flex cursor-grab touch-none items-center gap-[2px] bg-[#002766] py-[8px] pr-[8px] pl-[16px] select-none active:cursor-grabbing"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] leading-[18px] font-bold text-white">
                  {walkthrough.title}
                </span>
                <span className="text-[11px] leading-[15px] text-white/70">{step}</span>
              </span>
              <Link
                href={learn}
                aria-label="Open in Learn"
                title="Open in Learn"
                onPointerDown={(e) => e.stopPropagation()}
                className={HEADER_BUTTON}
              >
                <RiBookOpenLine className="size-[17px]" />
              </Link>
              <HeaderButton
                label="Unpin"
                testId="pinned-walkthrough-unpin"
                onClick={() => setPinned(null)}
              >
                <RiUnpinLine className="size-[17px]" />
              </HeaderButton>
              <HeaderButton
                label="Collapse to the side"
                testId="pinned-walkthrough-collapse"
                onClick={() => setPinned({ ...pinned, open: false })}
              >
                <RiSubtractLine className="size-[20px]" />
              </HeaderButton>
            </header>
            <div className="flex flex-col gap-[10px] p-[12px]">
              <WalkthroughStage
                walkthrough={walkthrough}
                at={at}
                onNext={() => goTo(at + 1)}
                small
                className="w-full rounded-[10px]"
              />
              <div className="flex min-h-[58px] flex-col gap-[2px] px-[4px]">
                <span className="text-[12px] leading-[16px] font-semibold text-[#8c8c8c]">
                  {walkthrough.steps[now.s].title}
                </span>
                <span
                  data-testid="pinned-walkthrough-text"
                  className="text-[15px] leading-[20px] font-semibold text-[#002766]"
                >
                  {now.text}
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <button
                  type="button"
                  data-testid="pinned-walkthrough-back"
                  disabled={at === 0}
                  onClick={() => goTo(at - 1)}
                  className="flex h-[34px] items-center gap-[6px] rounded-full border border-[#e8e8e8] px-[14px] text-[13px] font-semibold text-[#003a8c] hover:bg-[#f5f9ff] disabled:opacity-40"
                >
                  <RiArrowLeftLine className="size-[15px]" />
                  Back
                </button>
                <span className="flex-1 text-center text-[12px] text-[#8c8c8c] tabular-nums">
                  {at + 1} / {clicks.length}
                </span>
                <button
                  type="button"
                  data-testid="pinned-walkthrough-next"
                  onClick={() => (last ? setPinned(null) : goTo(at + 1))}
                  className="flex h-[34px] items-center gap-[6px] rounded-full bg-[#002766] px-[16px] text-[13px] font-semibold text-white hover:bg-[#003a8c]"
                >
                  {last ? 'Done' : 'Next'}
                  {!last && <RiArrowRightLine className="size-[15px]" />}
                </button>
              </div>
            </div>
            {Object.values(ResizeSide).map((side) => (
              <Fragment key={side}>
                <div
                  aria-hidden
                  data-testid={`pinned-walkthrough-resize-${side}`}
                  onPointerDown={resize(side)}
                  className={cn(
                    'absolute top-[56px] bottom-[18px] w-[8px] cursor-ew-resize touch-none',
                    side === ResizeSide.Left ? 'left-0' : 'right-0'
                  )}
                />
                <div
                  aria-hidden
                  data-testid={`pinned-walkthrough-corner-${side}`}
                  onPointerDown={resize(side)}
                  className={cn(
                    'group/corner absolute bottom-0 size-[22px] touch-none',
                    side === ResizeSide.Left
                      ? 'left-0 cursor-nesw-resize'
                      : 'right-0 cursor-nwse-resize'
                  )}
                >
                  <span
                    className={cn(
                      'absolute bottom-[5px] size-[9px] border-b-2 border-[#bfbfbf] transition-colors group-hover/corner:border-[#002766]',
                      side === ResizeSide.Left
                        ? 'left-[5px] rounded-bl-[6px] border-l-2'
                        : 'right-[5px] rounded-br-[6px] border-r-2'
                    )}
                  />
                </div>
              </Fragment>
            ))}
          </motion.section>
        ) : (
          <motion.button
            key="circle"
            type="button"
            data-testid="pinned-walkthrough-circle"
            aria-label={`Open the walkthrough ${walkthrough.title}, ${step.toLowerCase()}`}
            title={`${walkthrough.title} · ${step}`}
            onClick={() => setPinned({ ...pinned, open: true })}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed top-[46%] right-[12px] z-[1100] flex size-[48px] items-center justify-center rounded-full bg-[#002766] text-white shadow-[0_8px_20px_-4px_rgb(0_39_102/0.5)] transition-colors hover:bg-[#003a8c]"
          >
            <RiFootprintFill className="size-[22px]" />
            <span className="absolute -top-[4px] -right-[4px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#52c41a] px-[5px] text-[11px] font-bold text-white tabular-nums">
              {now.s + 1}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
