'use client';

import { RiFootprintLine, RiPushpinFill, RiPushpinLine } from '@remixicon/react';
import { useAtom } from 'jotai';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { pinnedWalkthroughAtom } from '@/features/learn/pinned-walkthrough';
import { type IWalkthrough, WALKTHROUGHS } from '@/features/learn/walkthroughs';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';
import { getActiveSection } from '@/utils/get-section';

const HEADING =
  'px-[6px] text-[11px] leading-[15px] font-bold tracking-[0.08em] text-[#8c8c8c] uppercase';

function Row({
  walkthrough,
  pinned,
  onOpen,
  onPin,
}: {
  walkthrough: IWalkthrough;
  pinned: boolean;
  onOpen: () => void;
  onPin: () => void;
}) {
  const pinLabel = pinned ? 'Unpin' : 'Pin to the side';
  return (
    <li className="relative">
      <button
        type="button"
        data-testid={`walkthroughs-menu-open-${walkthrough.id}`}
        title={`Open ${walkthrough.title} over the page`}
        onClick={onOpen}
        className={cn(
          'flex w-full items-center gap-[12px] rounded-[12px] p-[8px] pr-[46px] text-left transition-colors',
          pinned ? 'bg-[#e6f4ff]' : 'hover:bg-[#f5f9ff]'
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: a small static thumbnail */}
        <img
          src={walkthrough.steps[0].image}
          alt=""
          className="h-[50px] w-[80px] shrink-0 rounded-[8px] object-cover object-left-top shadow-[inset_0_0_0_1px_#f0f0f0]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <span className="text-[14px] leading-[18px] font-semibold text-[#002766]">
            {walkthrough.title}
          </span>
          <span className="line-clamp-2 text-[12px] leading-[16px] text-[#8c8c8c]">
            {walkthrough.short}
          </span>
        </span>
      </button>
      <button
        type="button"
        data-testid={`walkthroughs-menu-pin-${walkthrough.id}`}
        aria-label={`${pinLabel}: ${walkthrough.title}`}
        aria-pressed={pinned}
        title={pinLabel}
        onClick={onPin}
        className="absolute top-1/2 right-[8px] flex size-[32px] -translate-y-1/2 items-center justify-center rounded-full text-[#003a8c] transition-colors hover:bg-[#002766] hover:text-white"
      >
        {pinned ? (
          <RiPushpinFill className="size-[17px]" />
        ) : (
          <RiPushpinLine className="size-[17px]" />
        )}
      </button>
    </li>
  );
}

/** The toolbar's footprints: the walkthroughs, those for the page on show first, to open over it or pin. */
export function WalkthroughsMenu() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useAtom(pinnedWalkthroughAtom);
  // the assistant's button beside it, as large
  const breakpoint = useDefaultBreakpoint();
  const section = getActiveSection(usePathname()) ?? '';

  const recommended = WALKTHROUGHS.filter((w) => w.sections.includes(section));
  const others = WALKTHROUGHS.filter((w) => !w.sections.includes(section));

  // one already begun goes on from where it was
  const show = (walkthrough: IWalkthrough, opened: boolean) => {
    setPinned((current) => ({
      ...current,
      id: walkthrough.id,
      at: current?.id === walkthrough.id ? current.at : 0,
      open: opened,
    }));
    setOpen(false);
  };
  const rows = (walkthroughs: IWalkthrough[]) => (
    <ul className="flex flex-col gap-[4px]">
      {walkthroughs.map((w) => (
        <Row
          key={w.id}
          walkthrough={w}
          pinned={pinned?.id === w.id}
          onOpen={() => show(w, true)}
          onPin={() => (pinned?.id === w.id ? setPinned(null) : show(w, false))}
        />
      ))}
    </ul>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="walkthroughs-menu"
          aria-label="Walkthroughs"
          title="Walkthroughs"
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all active:scale-95',
            breakpoint === 'xl' ? 'size-12' : 'size-10',
            open
              ? 'border-[#002766] bg-[#002766] text-white'
              : 'text-primary-9 border-primary-9/30 hover:border-primary-9 bg-white hover:bg-[#f4f7fc]'
          )}
        >
          <RiFootprintLine className="size-[19px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        data-testid="walkthroughs-menu-list"
        className="flex max-h-[min(70vh,520px)] w-[380px] max-w-[calc(100vw-16px)] flex-col rounded-[18px] border-[#e8e8e8] bg-white p-0 shadow-[0_24px_60px_-12px_rgb(0_39_102/0.35)]"
      >
        <h2 className="shrink-0 px-[18px] pt-[14px] pb-[8px] text-[16px] leading-[21px] font-bold text-[#002766]">
          Walkthroughs
        </h2>
        <div className="secondary-scrollbar flex min-h-0 flex-col gap-[8px] overflow-y-auto px-[12px] pb-[12px]">
          {recommended.length > 0 && (
            <>
              <h3 className={HEADING}>Recommended for this page</h3>
              {rows(recommended)}
            </>
          )}
          {others.length > 0 && (
            <>
              {recommended.length > 0 && <h3 className={cn(HEADING, 'mt-[6px]')}>All others</h3>}
              {rows(others)}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
