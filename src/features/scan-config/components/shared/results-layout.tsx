import { RiArrowLeftLine } from '@remixicon/react';
import { Spin } from 'antd';
import { atom, useSetAtom } from 'jotai';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  PaneResizeHandle,
  PaneSideResizeHandle,
} from '@/features/circuit-viewer/pane-resize-handle';
import { ChromeButton } from '@/features/scan-config/components/color-by/chrome-button';
import { PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
  campaignId?: string;
  /** Beside the back arrow on the bar over an open side panel, such as a picker for which result is on show. */
  sidePanelBar?: ReactNode;
  /** After it, and kept over the campaign's statistics too: such as which report they are of. */
  sidePanelReport?: ReactNode;
  /** Offers, right after the bar's pickers, a region over the file and the panel comparing the campaign's results. */
  campaignStatistics?: boolean;
};

/**
 * A panel the file on the right can open beside itself, such as a spike
 * report's statistics: `target` to portal it into. Opening it moves everything
 * left a page, so the file takes the place of the first column and the panel
 * comes in where the file was, under a bar whose back arrow shuts it.
 *
 * Whether it is open is the layout's, not the file's: picking another result
 * from the bar swaps the file underneath, and the panel stays up for the next.
 */
export type ResultsSidePanel = {
  target: HTMLElement | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  /**
   * Whether the campaign's statistics are up, in a region of their own over
   * the file and the panel, with `campaignTarget` to portal them into.
   */
  campaign: boolean;
  campaignTarget: HTMLElement | null;
};

const ResultsSidePanelContext = createContext<ResultsSidePanel | null>(null);

/** Whether a results side panel is up: the tabs rail above folds away for it. */
export const resultsSidePanelOpenAtom = atom(false);

/** The side panel of the results layout around the caller; null outside one. */
export function useResultsSidePanel(): ResultsSidePanel | null {
  return useContext(ResultsSidePanelContext);
}

// `translate`, not `transform`: the property the columns are moved by. `width`
// for the file, which takes back its own column's width as the panel goes, and
// `margin` for what drops under the bar.
const SLIDE = 'transition-[translate,opacity,width,margin] duration-500 ease-in-out';
/** Its length, and a little over, after which a change of size moves things at once again. */
const SLIDE_MS = 550;

/** Room kept either side of the rule between the file and the panel. */
const MIN_SIDE_WIDTH = 320;
/** What the bar takes, in px: what `mt-14` gave the file and the panel under it. */
const BAR_ROOM = 56;
/** Between the campaign's region and what drops below it. */
const CAMPAIGN_GAP = 12;
/** The campaign region's share of the height, until its edge is dragged; and its floors. */
const CAMPAIGN_SHARE = 0.45;
const MIN_CAMPAIGN_HEIGHT = 160;
const MIN_BELOW_CAMPAIGN = 200;

export function ResultsLayout({
  left,
  middle,
  right,
  campaignId,
  sidePanelBar,
  sidePanelReport,
  campaignStatistics = false,
}: Props) {
  const idBase = campaignId ? `scan-config-results-${campaignId}` : 'scan-config-results';
  const leftId = `${idBase}-left-column`;
  const middleId = `${idBase}-middle-column`;
  const rightId = `${idBase}-right-column`;

  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [open, setOpenState] = useState(false);
  // Only the open and the close are eased. A change of size while open - the
  // assistant panel opening beside the results, a window drag - moves the
  // columns at once: eased, they trailed every resize by the slide's length.
  const [sliding, setSliding] = useState(false);
  const [campaignTarget, setCampaignTarget] = useState<HTMLDivElement | null>(null);
  const [campaignChosen, setCampaignChosen] = useState(false);
  const setOpen = useCallback((next: boolean) => {
    setSliding(true);
    setOpenState(next);
    // A panel opens on the neurons, whatever it was showing when shut.
    if (!next) setCampaignChosen(false);
  }, []);
  const chooseCampaign = (on: boolean) => {
    if (on === campaignChosen) return;
    setSliding(true);
    setCampaignChosen(on);
  };
  const campaign = open && campaignStatistics && campaignChosen;
  // biome-ignore lint/correctness/useExhaustiveDependencies: open restarts the timer for a slide begun mid-slide
  useEffect(() => {
    if (!sliding) return;
    const timer = setTimeout(() => setSliding(false), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [sliding, open]);
  const sidePanel = useMemo(
    () => ({ target, open, setOpen, campaign, campaignTarget }),
    [target, open, setOpen, campaign, campaignTarget]
  );
  const setPanelOpen = useSetAtom(resultsSidePanelOpenAtom);
  useEffect(() => {
    setPanelOpen(open);
    return () => setPanelOpen(false);
  }, [open, setPanelOpen]);

  // A page is the distance from the first column's start to the file's, which
  // is how far the columns move; `span` is the three columns' width. Offsets
  // and an element that never moves, so neither counts the move itself.
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLDivElement>(null);
  const [{ page, span, height }, setGeometry] = useState({ page: 0, span: 0, height: 0 });
  useLayoutEffect(() => {
    const leftColumn = leftRef.current;
    const rightColumn = rightRef.current;
    const spanned = spanRef.current;
    if (!leftColumn || !rightColumn || !spanned) return;
    const measure = () =>
      setGeometry({
        page: rightColumn.offsetLeft - leftColumn.offsetLeft,
        span: spanned.offsetWidth,
        height: spanned.offsetHeight,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(spanned);
    return () => observer.disconnect();
  }, []);

  // With the panel up the rule between it and the file sits mid-gap, where the
  // file's own column ends until it is dragged; `split` is the rule's share of
  // the span once it has been. While it follows the pointer nothing eases.
  const ownWidth = span - page;
  const gap = page - ownWidth;
  const [split, setSplit] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const rule = split === null ? ownWidth + gap / 2 : Math.round(split * span);
  const slide = sliding && !dragging && SLIDE;

  const moved = { translate: open ? `${-page}px 0` : '0px 0' };
  // Open, what the bar spans drops below it - and below the campaign's region
  // too, while that is up. The bar rides up into the grid's top padding, so
  // the room it takes is little more than its own row.
  const [chosenCampaignHeight, setChosenCampaignHeight] = useState<number | null>(null);
  const campaignHeight = Math.round(
    Math.max(
      MIN_CAMPAIGN_HEIGHT,
      Math.min(
        height - BAR_ROOM - CAMPAIGN_GAP - MIN_BELOW_CAMPAIGN,
        chosenCampaignHeight ?? height * CAMPAIGN_SHARE
      )
    )
  );
  const contentTop = open ? BAR_ROOM + (campaign ? campaignHeight + CAMPAIGN_GAP : 0) : 0;
  const campaignRegionRef = useRef<HTMLDivElement>(null);
  // The two left columns go out of view altogether.
  const away = open && 'opacity-0 pointer-events-none';

  // Every column is placed explicitly: the panel shares their grid cells, and
  // auto-placement would push them past it.
  return (
    <ResultsSidePanelContext.Provider value={sidePanel}>
      <div
        ref={leftRef}
        id={leftId}
        inert={open || undefined}
        style={moved}
        className={cn(
          'col-start-1 row-start-1 border-r border-gray-200 pr-4 secondary-scrollbar flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden',
          slide,
          away
        )}
      >
        {left}
      </div>
      <div
        id={middleId}
        data-testid="scan-config-results-files"
        inert={open || undefined}
        style={moved}
        className={cn(
          'col-start-2 row-start-1 relative border-r border-gray-200 secondary-scrollbar flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden',
          slide,
          away
        )}
      >
        {middle}
      </div>
      <div
        ref={rightRef}
        id={rightId}
        data-testid="scan-config-file-view"
        style={{ ...moved, width: open ? rule - gap / 2 : '100%', marginTop: contentTop }}
        className={cn(
          'col-start-3 row-start-1 relative secondary-scrollbar flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden',
          slide
        )}
      >
        {right}
      </div>
      <div
        inert={!open || undefined}
        className={cn(
          'border-neutral-2 col-start-1 col-end-4 row-start-1 z-10 -mt-2 flex items-center gap-2 self-start border-b px-1 pt-2 pb-3',
          slide,
          open ? 'opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        )}
      >
        <ChromeButton label="Back to the results" onClick={() => setOpen(false)}>
          <RiArrowLeftLine className="size-4" />
        </ChromeButton>
        {/* Campaign statistics take the picker down to the file they show. */}
        {sidePanelBar && !campaign && (
          <div className="flex min-w-0 items-center">{sidePanelBar}</div>
        )}
        {sidePanelReport}
        {/* What the statistics are over: the simulation on show, or the whole campaign. */}
        {campaignStatistics && (
          <div className={cn(PILL_CLASS, 'shrink-0 gap-0.5 p-1 hover:bg-white')}>
            {[
              { on: false, label: 'Simulation', title: 'The statistics of the simulation on show' },
              { on: true, label: 'Campaign', title: 'The statistics across the campaign' },
            ].map((choice) => (
              <button
                key={choice.label}
                type="button"
                aria-pressed={campaign === choice.on}
                title={choice.title}
                onClick={() => chooseCampaign(choice.on)}
                className={cn(
                  'h-full cursor-pointer rounded-full px-3 transition-colors',
                  campaign === choice.on
                    ? 'bg-primary-9 text-white'
                    : 'text-primary-9 hover:bg-neutral-100'
                )}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* The campaign's region, over the file and the panel, its height dragged by its edge */}
      <div
        ref={campaignRegionRef}
        inert={!campaign || undefined}
        style={{ marginTop: BAR_ROOM, height: campaignHeight }}
        className={cn(
          'border-neutral-2 relative col-start-1 col-end-4 row-start-1 z-[5] min-h-0 min-w-0 self-start border-b pb-3',
          slide,
          campaign ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div ref={setCampaignTarget} data-results-campaign className="h-full min-h-0 min-w-0" />
        {campaign && (
          <PaneResizeHandle
            containerRef={campaignRegionRef}
            minHeight={MIN_CAMPAIGN_HEIGHT}
            onResize={setChosenCampaignHeight}
            edge="bottom"
          />
        )}
      </div>
      {/* the panel, behind the rule and its grab bar; shut, it waits past the span's end */}
      <div
        inert={!open || undefined}
        style={{
          width: span - rule,
          translate: `${open ? rule : span + gap / 2}px 0`,
          marginTop: contentTop,
        }}
        className={cn(
          // No rule: the space between the file and the panel, and the grab bar in it, part them.
          'relative col-start-1 col-end-4 row-start-1 min-h-0 min-w-0 justify-self-start',
          slide,
          !open && 'pointer-events-none opacity-0'
        )}
      >
        <PaneSideResizeHandle
          containerRef={spanRef}
          minWidth={MIN_SIDE_WIDTH}
          onResize={(left) => setSplit(left / span)}
          onDragChange={setDragging}
        />
        {/* A little in from the grab bar, so it sits midway between the file and the panel. */}
        <div ref={setTarget} data-results-side-panel className="peer h-full min-h-0 min-w-0 pl-1" />
        {/* While the next file's panel is on its way, after a pick from the bar */}
        <div className="absolute inset-0 hidden items-center justify-center peer-empty:flex">
          <Spin />
        </div>
      </div>
      <div
        ref={spanRef}
        aria-hidden
        className="pointer-events-none invisible col-start-1 col-end-4 row-start-1"
      />
    </ResultsSidePanelContext.Provider>
  );
}
