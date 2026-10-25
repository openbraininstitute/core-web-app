import { RiArrowLeftLine } from '@remixicon/react';
import { Spin } from 'antd';
import { atom, useSetAtom } from 'jotai';
import { useReducedMotion } from 'motion/react';
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
  PaneSideResizeHandle,
  SHUT_BAR_SIZE,
  useShuttingSplit,
} from '@/features/circuit-viewer/pane-resize-handle';
import { ChromeButton } from '@/features/scan-config/components/color-by/chrome-button';
import { PillToggle } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { PaneShut } from '@/features/circuit-viewer/pane-resize-handle';

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
   * the panel's place beside the file, with `campaignTarget` to portal them
   * into: the panel's statistics are the simulation's, which the campaign's
   * take the place of.
   */
  campaign: boolean;
  campaignTarget: HTMLElement | null;
  /**
   * Which pane each split has shut, by the split's name: `file` for the
   * file's own panes, `panel` for the panel's, `columns` for the rule between
   * them. The layout's too, so a pick from the bar keeps them; closing the
   * panel opens them all again.
   */
  shuts: Readonly<Record<string, PaneShut>>;
  setShut: (split: string, shut: PaneShut) => void;
  /**
   * The strips the file and the panel shut into once the rule is dragged over
   * them, for each to put the bar naming its panes in, which opens it again.
   */
  fileStrip: HTMLElement | null;
  panelStrip: HTMLElement | null;
  openColumns: () => void;
  /**
   * While the columns slide, opening or closing: what is heavy to start - a 3D
   * scene, a plot - waits for the slide to end, so the main thread is free for it.
   */
  sliding: boolean;
};

const ResultsSidePanelContext = createContext<ResultsSidePanel | null>(null);

/** Whether a results side panel is up: the tabs rail above folds away for it. */
export const resultsSidePanelOpenAtom = atom(false);

/** The side panel of the results layout around the caller; null outside one. */
export function useResultsSidePanel(): ResultsSidePanel | null {
  return useContext(ResultsSidePanelContext);
}

// `translate`, not `transform`: the property the columns are moved by. `width`
// for the file, which takes back its own column's width as the panel goes.
const SLIDE = 'transition-[translate,opacity,width] duration-500 ease-in-out';
/** Its length, and a little over, after which a change of size moves things at once again. */
const SLIDE_MS = 550;
/** What drops under the bar, moved there in the slide's own time (`duration-500 ease-in-out`). */
const DROP = { id: 'results-drop', duration: 500, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' };

/** Room kept either side of the rule between the file and the panel. */
const MIN_SIDE_WIDTH = 320;
/**
 * A shut column's strip: its bar as far in as the panes' boxes were, which is
 * `mx-3` from either side of the file and `pl-1` more from the rule in the
 * panel - 10.5 px and 14 px at the app's 14 px rem.
 */
const FILE_STRIP_WIDTH = 10.5 + SHUT_BAR_SIZE + 10.5;
const PANEL_STRIP_WIDTH = 14 + SHUT_BAR_SIZE + 10.5;
/**
 * What the bar takes, in px: the tabs rail's height, which folds away as the bar
 * comes, so what it spans stays where it was and is not laid out again.
 */
const BAR_ROOM = 48;

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
  const [shuts, setShuts] = useState<Readonly<Record<string, PaneShut>>>({});
  const [fileStrip, setFileStrip] = useState<HTMLDivElement | null>(null);
  const [panelStrip, setPanelStrip] = useState<HTMLDivElement | null>(null);
  const setOpen = useCallback((next: boolean) => {
    setSliding(true);
    setOpenState(next);
    // A panel opens on the neurons with every pane up, whatever it was showing when shut.
    if (!next) {
      setCampaignChosen(false);
      setShuts({});
    }
  }, []);
  // A drag reports on every move: only a change is a new state.
  const setShut = useCallback((split: string, shut: PaneShut) => {
    setShuts((previous) =>
      (previous[split] ?? null) === shut ? previous : { ...previous, [split]: shut }
    );
  }, []);
  const openColumns = useCallback(() => {
    setSliding(true);
    setShut('columns', null);
  }, [setShut]);
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
    () => ({
      target,
      open,
      setOpen,
      campaign,
      campaignTarget,
      shuts,
      setShut,
      fileStrip,
      panelStrip,
      openColumns,
      sliding,
    }),
    [
      target,
      open,
      setOpen,
      campaign,
      campaignTarget,
      shuts,
      setShut,
      fileStrip,
      panelStrip,
      openColumns,
      sliding,
    ]
  );
  const setPanelOpen = useSetAtom(resultsSidePanelOpenAtom);
  // Before paint, so the rail folds from the same frame as the columns slide.
  useLayoutEffect(() => {
    setPanelOpen(open);
    return () => setPanelOpen(false);
  }, [open, setPanelOpen]);

  // A page is the distance from the first column's start to the file's, which
  // is how far the columns move; `span` is the three columns' width. Offsets
  // and an element that never moves, so neither counts the move itself.
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const spanRef = useRef<HTMLDivElement>(null);
  const [{ page, span }, setGeometry] = useState({ page: 0, span: 0 });
  useLayoutEffect(() => {
    const leftColumn = leftRef.current;
    const rightColumn = rightRef.current;
    const spanned = spanRef.current;
    if (!leftColumn || !rightColumn || !spanned) return;
    const measure = () =>
      setGeometry({
        page: rightColumn.offsetLeft - leftColumn.offsetLeft,
        span: spanned.offsetWidth,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(spanned);
    return () => observer.disconnect();
  }, []);

  // With the panel up the rule between it and the file sits mid-gap, where the
  // file's own column ends until it is dragged; `split` is the panel's share of
  // the span once it has been. While it follows the pointer nothing eases.
  const ownWidth = span - page;
  const gap = page - ownWidth;
  const [split, setSplit] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  // Dragged far over the file or the panel, the rule shuts it into a strip of
  // its panes' bars, and the other takes the room; a shut column keeps the
  // width it had, out of view, so nothing in it is squeezed.
  const columns = useShuttingSplit({
    chosen: split === null ? null : split * span,
    onChosenChange: (end) => setSplit(end === null ? null : end / span),
    shut: shuts.columns ?? null,
    onShutChange: (shut) => setShut('columns', shut),
    total: span,
    floors: [MIN_SIDE_WIDTH, MIN_SIDE_WIDTH],
    preferred: span - (ownWidth + gap / 2),
  });
  // Beside the file while it is up: the panel, or the campaign's statistics in its place.
  const fileShut = open && columns.shut === 'start';
  const panelShut = open && columns.shut === 'end';
  const openRule = span - columns.size;
  // Where the file ends: past the span's end, with nothing beside it.
  const rule = !open
    ? span + gap / 2
    : fileShut
      ? FILE_STRIP_WIDTH + gap / 2
      : panelShut
        ? span - PANEL_STRIP_WIDTH
        : openRule;
  const panelUp = open && !campaign && !panelShut;
  const campaignUp = open && campaign && !panelShut;
  const slide = sliding && !dragging && SLIDE;

  const moved = { translate: open ? `${-page}px 0` : '0px 0' };
  // Open, what the bar spans drops below it. The bar rides up into the grid's
  // top padding, so the room it takes is little more than its own row.
  const contentTop = open ? BAR_ROOM : 0;
  // The drop is laid out at once and played as a move from where it was: eased
  // as a margin, it laid the file and the panel out again on every frame.
  const reduce = Boolean(useReducedMotion());
  const laidTop = useRef(contentTop);
  useLayoutEffect(() => {
    const from = laidTop.current - contentTop;
    laidTop.current = contentTop;
    const grid = spanRef.current?.parentElement;
    if (from === 0 || !grid || reduce) return;
    for (const element of grid.querySelectorAll<HTMLElement>(':scope > [data-results-drop]')) {
      // From wherever a drop still under way has got it to.
      const under = new DOMMatrix(getComputedStyle(element).transform).m42;
      for (const animation of element.getAnimations()) {
        if (animation.id === DROP.id) animation.cancel();
      }
      element.animate(
        [{ transform: `translateY(${from + under}px)` }, { transform: 'none' }],
        DROP
      );
    }
  }, [contentTop, reduce]);
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
        data-results-drop
        inert={fileShut || undefined}
        style={{
          // Shut, it waits off the span's start.
          translate: open ? `${-page - (fileShut ? openRule : 0)}px 0` : '0px 0',
          // Its own column's width until the rule is dragged, the panel up or
          // not, so there is nothing to ease and lay out again on every frame.
          width:
            open && (panelShut || split !== null) ? (fileShut ? openRule : rule) - gap / 2 : '100%',
          marginTop: contentTop,
        }}
        className={cn(
          'col-start-3 row-start-1 relative secondary-scrollbar flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden',
          slide,
          fileShut && 'pointer-events-none opacity-0'
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
        {sidePanelBar && <div className="flex min-w-0 items-center">{sidePanelBar}</div>}
        {sidePanelReport}
        {/* What the statistics are over: the simulation on show, or the whole campaign. */}
        {campaignStatistics && (
          <PillToggle
            value={campaign}
            onChange={chooseCampaign}
            options={[
              {
                value: false,
                label: 'Simulation',
                title: 'The statistics of the simulation on show',
              },
              { value: true, label: 'Campaign', title: 'The statistics across the campaign' },
            ]}
          />
        )}
      </div>
      {/* The campaign's statistics in the panel's place; out of view, they wait past the span's end too */}
      <div
        inert={!campaignUp || undefined}
        data-results-drop
        style={{
          width: span - (campaignUp ? rule : openRule),
          translate: `${campaignUp ? rule : span + gap / 2}px 0`,
          marginTop: contentTop,
        }}
        className={cn(
          'relative col-start-1 col-end-4 row-start-1 min-h-0 min-w-0 justify-self-start',
          slide,
          !campaignUp && 'pointer-events-none opacity-0'
        )}
      >
        <div
          ref={setCampaignTarget}
          data-results-campaign
          className="h-full min-h-0 min-w-0 pl-1"
        />
      </div>
      {/* the panel; closed, shut or under the campaign's, it waits past the span's end */}
      <div
        inert={!panelUp || undefined}
        data-results-drop
        style={{
          width: span - (panelUp ? rule : openRule),
          translate: `${panelUp ? rule : span + gap / 2}px 0`,
          marginTop: contentTop,
        }}
        className={cn(
          // No rule: the space between the file and the panel, and the grab bar in it, part them.
          'relative col-start-1 col-end-4 row-start-1 min-h-0 min-w-0 justify-self-start',
          slide,
          !panelUp && 'pointer-events-none opacity-0'
        )}
      >
        {/* A little in from the grab bar, so it sits midway between the file and the panel. */}
        <div ref={setTarget} data-results-side-panel className="peer h-full min-h-0 min-w-0 pl-1" />
        {/* While the next file's panel is on its way, after a pick from the bar */}
        <div className="absolute inset-0 hidden items-center justify-center peer-empty:flex">
          <Spin />
        </div>
      </div>
      {/* The strips a column shuts into, where it portals the bar naming its panes. */}
      <div
        inert={!fileShut || undefined}
        data-results-drop
        style={{ width: FILE_STRIP_WIDTH, marginTop: contentTop }}
        className={cn(
          'relative col-start-1 col-end-4 row-start-1 min-h-0 justify-self-start p-3',
          slide,
          !fileShut && 'pointer-events-none opacity-0'
        )}
      >
        <div ref={setFileStrip} className="flex h-full min-h-0 flex-col *:flex-1" />
      </div>
      <div
        inert={!panelShut || undefined}
        data-results-drop
        style={{ width: PANEL_STRIP_WIDTH, marginTop: contentTop }}
        className={cn(
          'relative col-start-1 col-end-4 row-start-1 min-h-0 justify-self-end py-3 pr-3 pl-4',
          slide,
          !panelShut && 'pointer-events-none opacity-0'
        )}
      >
        <div ref={setPanelStrip} className="flex h-full min-h-0 flex-col *:flex-1" />
      </div>
      {/* The rule's grab bar, on its own so it stays between whichever of the two is shut */}
      <div
        inert={!open || undefined}
        data-results-drop
        style={{ translate: `${rule}px 0`, marginTop: contentTop }}
        className={cn(
          'relative z-10 col-start-1 col-end-4 row-start-1 w-0 justify-self-start',
          slide,
          !open && 'pointer-events-none opacity-0'
        )}
      >
        <PaneSideResizeHandle
          containerRef={spanRef}
          minWidth={0}
          onResize={(left) => columns.onResize(span - left)}
          onDragChange={(next) => {
            setDragging(next);
            columns.onDragChange(next);
          }}
        />
      </div>
      <div
        ref={spanRef}
        aria-hidden
        className="pointer-events-none invisible col-start-1 col-end-4 row-start-1"
      />
    </ResultsSidePanelContext.Provider>
  );
}
