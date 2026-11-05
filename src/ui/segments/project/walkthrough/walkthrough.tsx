'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { config } from '@/config';
import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { learnFonts } from '@/features/learn/fonts';
import { BareViewers } from '@/features/viewer-3d/bare';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { FindOutMore } from '@/ui/segments/landing/layout/find-out-more';
import { HOME_DESIGNS } from '@/ui/segments/project/home-designs';
import { cn } from '@/utils/css-class';

import { AccountFlow, Initials, readDummyAccount } from './account-flow';

import type { CSSProperties, ReactNode } from 'react';
import type { THomeDesign } from '@/ui/segments/project/home-designs';
import type { IDummyAccount } from './account-flow';

/** A screen of a walkthrough: its words, and what its stage shows, which each walkthrough says. */
export interface IWalkthroughChapter {
  id: string;
  /** Over the progress dots while it is on. */
  label: string;
  /** Colour-by for the circuit on show, in the chapter's column. */
  colorBy?: boolean;
  /** Small, over the title. */
  kicker?: string;
  title: ReactNode;
  /** The opening chapter's larger title. */
  hero?: boolean;
  /** The words across the top, over a stage as wide as the page, rather than beside it. */
  wide?: boolean;
  /** Its title set apart from the others': a class, such as a face. */
  titleClass?: string;
  /** Classes for its words' column over the usual ones, such as a wider one. */
  column?: string;
  /** Its words from the top of the screen rather than in the middle of its height. */
  top?: boolean;
  body: ReactNode;
  /** Under the words and the colour-by: figures and where to go from here. */
  after?: ReactNode;
}

/** Whether the walkthrough's intro is over and its first screen entered: what it shows may come in then. */
const EnteredContext = createContext(true);

export function useWalkthroughEntered(): boolean {
  return useContext(EnteredContext);
}

/** What a chapter's words can do of the walkthrough's own, as its top bar does: enter the platform, or sign up. */
const ActionsContext = createContext<{ enter: () => void; signUp: () => void } | null>(null);

export function useWalkthroughActions() {
  return useContext(ActionsContext);
}

/** How long a scroll must have rested before it is taken on to the next screen, ms. */
const SNAP_AFTER_MS = 140;

/** How long the first screen must have been at the top before scrolling up brings the intro back, ms. */
const AT_TOP_MS = 500;

/** How far a finger must pull down from the top of the first screen to bring the intro back, px. */
const PULL_PX = 60;

/** The page's scroller, which the walkthrough is a screen of at a time. */
const SCROLLER = '#workspace-body';

/** How long the walkthrough takes to give way to the home it leads to, ms. */
const FINISH_MS = 800;

/**
 * A walkthrough: the project home as a story told while scrolling, after everyneuron.com, a screen
 * per chapter, the words on the left, and on the right its `stage`, the data the platform holds in
 * its own 3D views, set into the page. Colour-by is the only control over them; a click on a neuron
 * tells what it is. Scrolled past its end, or → on its last chapter, it leads to the home of `end`.
 */
export function Walkthrough<C extends IWalkthroughChapter>({
  chapters,
  stage,
  fullscreen = false,
  bold = false,
  intro,
  end = 'main',
  endUnder,
  enterHref,
  floating,
  introTail,
  introFoot,
  introBase,
  introStay,
  introContent,
  introFloats = 1,
  firstTitleClass,
  pager = true,
  footer,
}: {
  chapters: readonly C[];
  /** The right of the page for the chapter on, with where that chapter puts colour-by, and a way to another chapter. */
  stage: (chapter: C, colorSlot: HTMLElement | null, goTo: (id: string) => void) => ReactNode;
  /** Over the whole window, the platform's menus included, with its own way into the platform. */
  fullscreen?: boolean;
  /** The titles in bold, rather than light. */
  bold?: boolean;
  /**
   * Words under the logo in the middle of a white page, before the first screen, with its title under
   * them: when it is entered they fade, and its title rises to its place.
   */
  intro?: string;
  /** The home design it leads to at its end, and that Enter the platform opens; the first, the home itself. */
  end?: THomeDesign;
  /** Over the whole window: that home, drawn under it as it ends, so that it is uncovered rather than loaded after. */
  endUnder?: ReactNode;
  /**
   * Where Enter the platform and the end lead, in full: given on the public landing, where there is no
   * workspace to build the home address from. When set, `end`/`endUnder` are not used.
   */
  enterHref?: string;
  /** The numbered rail of chapters down the right edge, full screen; off where the host has its own. */
  pager?: boolean;
  /** Room kept along the foot of the screens for a line of the host's own, the way on above it: a CSS length. */
  footer?: string;
  /**
   * Something floating over the page, the intro too, told whether it is entered and which chapter is on; it
   * calls `ready` once what floats over the intro is built, and the intro waits for that to start; `goTo` takes
   * the page to a chapter, by its id.
   */
  floating?: (state: {
    entered: boolean;
    revealed: boolean;
    chapter: number;
    enter: () => void;
    ready: () => void;
    goTo: (id: string) => void;
  }) => ReactNode;
  /** Words after the intro's, in italics, coming a beat after them. */
  introTail?: string;
  /** Under the intro's way in, small: a note of the host's own. */
  introFoot?: ReactNode;
  /** Along the intro's foot: a line of the host's own. */
  introBase?: ReactNode;
  /** How long the intro stands once its words are out before going on to the first screen by itself, ms. */
  introStay?: number;
  /** A public landing may supply its own opening while keeping the chapter walkthrough. */
  introContent?: (actions: { continue: () => void; goTo: (id: string) => void }) => ReactNode;
  /** How many of what floats over the intro call `ready`: it waits for them all. */
  introFloats?: number;
  /** The first chapter's title, where the intro's words come to rest, set apart from the others: a class, such as a face. */
  firstTitleClass?: string;
}) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const sections = useRef<Array<HTMLElement | null>>([]);
  // The scroller's height, a chapter's: until it is measured, the screen less the top menu.
  const [height, setHeight] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [colorSlot, setColorSlot] = useState<HTMLElement | null>(null);
  // Over the whole window, it is laid over the page's body once in the browser.
  const [inBrowser, setInBrowser] = useState(false);
  useEffect(() => setInBrowser(true), []);
  // The intro plays first, and comes back when the first screen is scrolled up past.
  const [introState, setIntroState] = useState<'playing' | 'returning' | 'done'>(
    intro ? 'playing' : 'done'
  );
  const introDone = introState === 'done';
  const finishIntro = useCallback(() => setIntroState('done'), []);
  // From the click, wheel or key that enters until the intro comes back: what floats over it goes then.
  const [introLeft, setIntroLeft] = useState(false);
  const leaveIntro = useCallback(() => {
    const intro = root?.querySelector<HTMLElement>('[data-walkthrough-intro]');
    const first = sections.current[0];
    if (root && intro && first) flyShared(root, intro, first);
    setIntroLeft(true);
  }, [root]);
  // What floats over the intro built, for the intro to start with it.
  const [floated, setFloated] = useState(0);
  const floatReady = useCallback(() => setFloated((built) => built + 1), []);
  // Back to the intro from the first screen, by the wheel, a key or its arrow.
  const backToIntro = useCallback(() => {
    setIntroState('returning');
    setIntroLeft(false);
  }, []);
  // Entering asked for by what floats over the intro, as a click on the intro itself would.
  const [enterAsked, setEnterAsked] = useState(0);
  const askEnter = useCallback(() => setEnterAsked((asked) => asked + 1), []);
  // The dummy sign-up and log-in, and the test account they leave signed in, kept in this browser.
  const [accountFlow, setAccountFlow] = useState<'signup' | 'login' | null>(null);
  const closeAccountFlow = useCallback(() => setAccountFlow(null), []);
  const [account, setAccount] = useState<IDummyAccount | null>(null);
  useEffect(() => setAccount(readDummyAccount()), []);

  useEffect(() => {
    const scroller = fullscreen ? root : root?.closest<HTMLElement>(SCROLLER);
    if (!scroller) return;
    scroller.scrollTop = 0;
    const sized = new ResizeObserver(() => setHeight(scroller.clientHeight));
    sized.observe(scroller);
    // The chapter across the middle of the scroller is the one on.
    const crossing = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: scroller, rootMargin: '-50% 0px -50% 0px' }
    );
    for (const section of sections.current) if (section) crossing.observe(section);
    return () => {
      sized.disconnect();
      crossing.disconnect();
    };
  }, [root, fullscreen]);

  // Up from the top of the first screen, the intro again: by the wheel once the page has rested at the
  // top a moment, so that a scroll up from the second screen does not run on into it, by ← or ↑, or by a finger
  // pulled down.
  useEffect(() => {
    if (!intro || !introDone || !root) return;
    let topSince = root.scrollTop <= 1 ? performance.now() : Number.POSITIVE_INFINITY;
    const onScroll = () => {
      if (root.scrollTop > 1) topSince = Number.POSITIVE_INFINITY;
      else if (topSince === Number.POSITIVE_INFINITY) topSince = performance.now();
    };
    const back = backToIntro;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0 && root.scrollTop <= 1 && performance.now() - topSince > AT_TOP_MS) back();
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && root.scrollTop <= 1) back();
    };
    // Told as the finger lifts: while it still moves, the intro would take that for a way in again.
    let pulledFrom: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      const rested = root.scrollTop <= 1 && performance.now() - topSince > AT_TOP_MS;
      pulledFrom = rested ? e.touches[0].clientY : null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (pulledFrom !== null && e.changedTouches[0].clientY - pulledFrom > PULL_PX) back();
      pulledFrom = null;
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    root.addEventListener('wheel', onWheel, { passive: true });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('scroll', onScroll);
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKey);
    };
  }, [intro, introDone, root, backToIntro]);

  // Finished, the walkthrough fades and the home it leads to opens.
  const router = useRouter();
  const { virtualLabId, projectId } = useWorkspace();
  const endHref =
    enterHref ??
    `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}${end === HOME_DESIGNS[0] ? '' : `?design=${end}`}`;
  const finish = useCallback(() => {
    setFinishing(true);
    setTimeout(() => router.push(endHref), FINISH_MS);
  }, [router, endHref]);
  // For a chapter's own buttons, as the top bar's.
  const actions = useMemo(
    () => ({ enter: finish, signUp: () => setAccountFlow('signup') }),
    [finish]
  );
  // The runway past the last chapter, crossing the middle of the scroller, is the end.
  useEffect(() => {
    if (active === chapters.length) finish();
  }, [active, finish, chapters.length]);

  const go = useCallback(
    (index: number) => {
      if (index >= chapters.length) {
        finish();
        return;
      }
      sections.current[Math.max(0, index)]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [finish, chapters.length]
  );

  const goTo = useCallback(
    (id: string) => {
      const index = chapters.findIndex((chapter) => chapter.id === id);
      if (index >= 0) go(index);
    },
    [chapters, go]
  );

  // Over the whole window, a screen at a time: a scroll let go of part way between two settles on the nearer,
  // once it has come to rest, momentum and all; the runway past the last is one.
  useEffect(() => {
    if (!fullscreen || !root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      const now = root.scrollTop;
      const top = root.getBoundingClientRect().top;
      const screen = root.clientHeight;
      const placed = sections.current.filter((section): section is HTMLElement => section !== null);
      // Taller than the screen, as on a small phone, a chapter is read down through, its foot a stop as well.
      const boxes = placed.map((section) => section.getBoundingClientRect());
      if (boxes.some((box) => box.top - top < 0 && box.bottom - top >= screen - 2)) return;
      const stops = boxes.flatMap((box) => {
        const at = Math.round(box.top - top + now);
        return box.height > screen + 2 ? [at, at + Math.round(box.height - screen)] : [at];
      });
      if (stops.length === 0 || stops.some((stop) => Math.abs(stop - now) <= 2)) return;
      const nearest = stops.reduce((best, stop) =>
        Math.abs(stop - now) < Math.abs(best - now) ? stop : best
      );
      root.scrollTo({ top: nearest, behavior: 'smooth' });
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, SNAP_AFTER_MS);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, [fullscreen, root]);

  // ← and → go a chapter back and on, as on everyneuron; up and down scroll as ever.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const typing = (e.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"]'
      );
      if (typing) return;
      if (e.key === 'ArrowRight') go(active + 1);
      else if (e.key === 'ArrowLeft') go(active - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, go]);

  // The runway past the end is no chapter: the last one stays on while it is crossed.
  const on = Math.min(active, chapters.length - 1);
  const chapter = chapters[on];
  // While the intro is up, the first screen waits a page below it, and scrolls up as it leaves.
  const underIntro: CSSProperties = {
    transform: intro && !introDone && !introLeft ? 'translateY(100vh)' : 'none',
    transition: SCROLL,
  };

  const page = (
    <EnteredContext.Provider value={introDone || introLeft}>
      <ActionsContext.Provider value={actions}>
        <BareViewers>
          <div
            ref={setRoot}
            className={cn(
              'text-primary-9 bg-white transition-[opacity,scale] ease-in-out',
              fullscreen
                ? 'fixed inset-0 z-[45] overflow-x-hidden overflow-y-auto overscroll-y-contain'
                : 'relative min-h-full',
              // Lifted away, the home under it uncovered.
              finishing && 'pointer-events-none scale-[1.04] opacity-0',
              learnFonts
            )}
            style={
              {
                '--chapter-h': height ? `${height}px` : 'calc(100vh - 6rem)',
                // Held upright, a stage's video across the page, under the top bar, lower the taller the screen.
                '--stage-video-h':
                  'min(calc((100vw - 32px) * 0.5625), calc(var(--chapter-h) * 0.32))',
                '--stage-video-top': 'max(60px, calc(var(--chapter-h) * 0.35 - 160px))',
                fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
                transitionDuration: `${FINISH_MS}ms`,
              } as CSSProperties
            }
          >
            {floating?.({
              entered: introDone || introLeft,
              revealed: introDone,
              chapter: on,
              enter: askEnter,
              ready: floatReady,
              goTo,
            })}
            {intro && !introDone && !introContent && (
              <Intro
                key={introState}
                title={intro}
                tail={introTail}
                foot={introFoot}
                base={introBase}
                returning={introState === 'returning'}
                ready={!floating || floated >= introFloats}
                asked={enterAsked}
                stay={accountFlow ? undefined : introStay}
                onLeave={leaveIntro}
                onDone={finishIntro}
              />
            )}
            {intro &&
              !introDone &&
              introContent?.({
                continue: () => {
                  setIntroLeft(true);
                  finishIntro();
                },
                goTo: (id) => {
                  setIntroLeft(true);
                  finishIntro();
                  requestAnimationFrame(() => requestAnimationFrame(() => goTo(id)));
                },
              })}
            {/* The stage's scenes take the pointer, unless one lets it through to what floats under it. */}
            <div
              className="pointer-events-none sticky top-0 h-(--chapter-h) overflow-hidden"
              style={underIntro}
            >
              {stage(chapter, colorSlot, goTo)}
              {!fullscreen && (
                <div className="pointer-events-auto">
                  <Progress chapters={chapters} active={on} onGo={go} />
                </div>
              )}
            </div>
            {/* Over what floats over the page, so that it is always to hand. */}
            {fullscreen && pager && (
              <SidePager chapters={chapters} active={on} onGo={go} shown={introDone} />
            )}
            {fullscreen && (
              <SlideArrows
                onUp={on > 0 ? () => go(on - 1) : intro ? backToIntro : null}
                onDown={() => go(on + 1)}
                last={on === chapters.length - 1}
                shown={introDone}
                bottom={footer}
              />
            )}
            {fullscreen && (
              <AccountFlow
                mode={accountFlow}
                onClose={closeAccountFlow}
                onSignedIn={setAccount}
                onEnter={() => {
                  setAccountFlow(null);
                  finish();
                }}
                onLearn={() =>
                  router.push(
                    `/app/learn/brain-modeling?from=${encodeURIComponent(window.location.href)}`
                  )
                }
              />
            )}
            {/* Over the intro too: the ways in are there from the first. */}
            {fullscreen && (
              <div
                className={cn(
                  'pointer-events-none fixed inset-x-0 top-0 z-[70] flex items-start justify-between px-[clamp(20px,3vw,40px)] pt-[22px] max-sm:px-[16px] max-sm:pt-[14px] squat:pt-[10px]',
                  introContent && 'bg-white pb-[14px]'
                )}
              >
                <span
                  data-walkthrough-logo
                  className={cn(
                    'shrink-0 transition-opacity duration-500',
                    introDone || introContent ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <ObiLogo className="block h-[clamp(44px,5vh,56px)] w-auto text-[#002766] max-sm:h-[38px] squat:h-[36px]" />
                </span>
                <div className="pointer-events-auto flex items-center gap-[20px] max-sm:gap-[10px]">
                  <FindOutMore shown={introDone || !!introContent} />
                  {/* For now, the home it leads to, uncovered as the walkthrough lifts away. */}
                  <button
                    type="button"
                    onClick={finish}
                    className={cn(
                      'rounded-full px-[22px] py-[10px] text-[14px] leading-[18px] font-semibold whitespace-nowrap text-white transition-[filter] hover:brightness-110 max-sm:px-[16px] max-sm:py-[8px] max-sm:text-[13px] squat:py-[8px]',
                      introContent
                        ? 'bg-[#183f8b]'
                        : 'bg-green-main shadow-[0_4px_14px_rgba(0,140,5,0.25)]'
                    )}
                  >
                    Enter the platform
                  </button>
                  {account && (
                    <AccountChip
                      account={account}
                      onSignOut={() => {
                        try {
                          localStorage.removeItem('walkthrough/dummy-account');
                        } catch {
                          // Gone from the page, at least.
                        }
                        setAccount(null);
                      }}
                    />
                  )}
                </div>
              </div>
            )}
            <div
              className="pointer-events-none relative z-10"
              style={{ marginTop: 'calc(var(--chapter-h) * -1)', ...underIntro }}
            >
              {chapters.map((chapter, index) => (
                <section
                  key={chapter.id}
                  id={`walkthrough-${chapter.id}`}
                  data-index={index}
                  ref={(section) => {
                    sections.current[index] = section;
                  }}
                  className={cn(
                    'flex min-h-(--chapter-h)',
                    chapter.wide
                      ? 'items-start'
                      : chapter.top
                        ? 'items-end beside:items-start'
                        : 'items-end beside:items-center'
                  )}
                >
                  <ChapterText
                    chapter={chapter}
                    on={index === on}
                    bold={bold}
                    first={index === 0}
                    firstClass={firstTitleClass}
                    onColorSlot={setColorSlot}
                  />
                </section>
              ))}
              {/* Past the last chapter, the way on to the home. */}
              <section
                data-index={chapters.length}
                ref={(section) => {
                  sections.current[chapters.length] = section;
                }}
                className="h-[60vh]"
              />
            </div>
          </div>
        </BareViewers>
      </ActionsContext.Provider>
    </EnteredContext.Provider>
  );
  if (!fullscreen) return page;
  return (
    <>
      {finishing && endUnder}
      {inBrowser && createPortal(page, document.body)}
    </>
  );
}

/** The test account signed in, by its initials and name; a click shows it, and signs it out. */
function AccountChip({ account, onSignOut }: { account: IDummyAccount; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((now) => !now)}
        aria-expanded={open}
        className="text-primary-9 hover:border-primary-9 flex items-center gap-[8px] rounded-full border border-neutral-200 bg-white py-[4px] pr-[14px] pl-[4px] text-[14px] font-semibold transition-colors"
      >
        <Initials first={account.firstName} last={account.lastName} size={30} />
        {account.firstName}
      </button>
      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 flex w-[240px] flex-col gap-[10px] rounded-[14px] border border-neutral-200 bg-white p-[14px] shadow-[0_12px_32px_rgba(0,39,102,0.12)]">
          <div className="flex flex-col">
            <span className="text-primary-9 text-[14px] font-semibold">
              {account.firstName} {account.lastName}
            </span>
            <span className="truncate text-[12px] text-neutral-500">{account.email}</span>
            <span className="mt-[4px] text-[12px] text-neutral-500">{account.labName}</span>
          </div>
          <span className="w-fit rounded-full bg-amber-100 px-[8px] py-[1px] text-[10px] font-semibold tracking-[0.08em] text-amber-700 uppercase">
            Test account
          </span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="hover:text-primary-9 text-left text-[13px] font-semibold text-neutral-600"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** A chapter's words, fading up as it comes on; with the place colour-by goes, where it offers it. */
function ChapterText({
  chapter,
  on,
  bold,
  first,
  firstClass,
  onColorSlot,
}: {
  chapter: IWalkthroughChapter;
  on: boolean;
  bold: boolean;
  /** The first chapter's: its title is where the intro's comes to rest. */
  first: boolean;
  /** The class its title is set in, where it is the first chapter's. */
  firstClass?: string;
  onColorSlot: (slot: HTMLElement | null) => void;
}) {
  const { kicker, title, hero, body, colorBy, after, wide, titleClass, column } = chapter;
  return (
    <div
      inert={!on || undefined}
      className={cn(
        'flex w-full flex-col gap-[18px] transition-[opacity,translate] duration-700 ease-out',
        wide
          ? 'px-[clamp(20px,5vw,88px)] pt-[clamp(100px,14vh,150px)] beside:max-w-[1400px]'
          : cn(
              'bg-white/90 px-[20px] pt-[20px] pb-[88px]',
              'beside:w-[38%] beside:max-w-[540px] beside:bg-transparent beside:py-[72px] beside:pr-0 beside:pl-[clamp(32px,5vw,88px)]'
            ),
        on ? 'pointer-events-auto translate-y-0 opacity-100' : 'translate-y-[24px] opacity-0',
        column
      )}
    >
      {kicker && (
        <p className="text-[11px] leading-[16px] font-semibold tracking-[0.16em] uppercase">
          {kicker}
        </p>
      )}
      {hero ? (
        <h1
          data-walkthrough-title={first || undefined}
          // The first title on one line, as the intro's words rise into its place as one.
          className={cn(
            heroClass(wide, bold),
            first && cn(wide && 'whitespace-nowrap', firstClass),
            titleClass
          )}
        >
          {title}
        </h1>
      ) : (
        <h2
          className={cn(
            'text-[clamp(30px,2.8vw,42px)] leading-[1.12] tracking-[-0.015em]',
            bold ? 'font-bold' : 'font-light'
          )}
        >
          {title}
        </h2>
      )}
      {body && (
        <div className="flex flex-col gap-[12px] text-[14px] leading-[1.6] text-neutral-600">
          {body}
        </div>
      )}
      {colorBy && <div ref={on ? onColorSlot : undefined} className="min-h-[34px]" />}
      {after}
    </div>
  );
}

/** A hero title's type: smaller across a wide chapter's top, and bold or light. */
function heroClass(wide: boolean | undefined, bold: boolean): string {
  return cn(
    wide
      ? 'text-[clamp(26px,2.5vw,40px)]'
      : 'text-[clamp(40px,4.4vw,64px)] stacked:text-[clamp(28px,8.2vw,44px)] stacked:text-balance squat:text-[clamp(26px,3.6vw,32px)]',
    'leading-[1.12] tracking-[-0.02em]',
    bold ? 'font-bold' : 'font-light'
  );
}

/**
 * How the intro runs, ms: held for what floats over it at most, the logo coming up, each line typed out under
 * it a key at a time and then let stand, then the page scrolling on, or back.
 */
const INTRO = { hold: 5000, logo: 1300, key: 45, typed: 700, scroll: 1000 };
const typingMs = (line: string) => line.length * INTRO.key + INTRO.typed;
const SCROLL_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
/** The page scrolling on from the intro to the first screen, or back. */
const SCROLL = `transform ${INTRO.scroll}ms ${SCROLL_EASE}`;

/**
 * The walkthrough's opening: the logo alone in the middle of a white page, `title` fading in under it and
 * `tail` under that; all held there until a click, a turn of the wheel or a key, or for `stay`. Then it scrolls up
 * and away as a page would, the first screen coming up from under it. Scrolled back up to, it comes down again.
 */
function Intro({
  title,
  tail,
  foot,
  base,
  returning = false,
  ready = true,
  asked = 0,
  stay,
  onLeave,
  onDone,
}: {
  title: string;
  /** In italics on a line of its own under `title`, a beat after it. */
  tail?: string;
  /** Under the way in, small. */
  foot?: ReactNode;
  /** Along the foot of the page, with the tail. */
  base?: ReactNode;
  /** Come back from the first screen: down from above, as a page scrolled back up to. */
  returning?: boolean;
  /** Whether what floats over it is built: until then, or `INTRO.hold` at most, it is blank, to start with it. */
  ready?: boolean;
  /** Entering asked for from outside: each new count enters, as a click would. */
  asked?: number;
  /** How long it stands once all of it is out before leaving by itself, ms; without it, until asked. */
  stay?: number;
  /** Told as it starts to leave for the first screen. */
  onLeave?: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<
    'hold' | 'logo' | 'title' | 'next' | 'waiting' | 'leaving' | 'back' | 'returning'
  >(returning ? 'back' : 'hold');
  if (phase === 'hold' && ready) setPhase('logo');
  const done = useRef(onDone);
  const left = useRef(onLeave);
  useEffect(() => {
    done.current = onDone;
    left.current = onLeave;
  });
  const phaseNow = useRef(phase);
  useEffect(() => {
    phaseNow.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase === 'waiting') return;
    if (phase === 'back') {
      // Above the page at once, then let go of on the next frame, to come down.
      const frame = requestAnimationFrame(() => setPhase('returning'));
      return () => cancelAnimationFrame(frame);
    }
    const [wait, then] =
      phase === 'hold'
        ? [INTRO.hold, () => setPhase('logo')]
        : phase === 'logo'
          ? [INTRO.logo, () => setPhase('title')]
          : phase === 'title'
            ? [typingMs(title), () => setPhase('next')]
            : phase === 'next'
              ? [typingMs(tail ?? ''), () => setPhase('waiting')]
              : phase === 'returning'
                ? [INTRO.scroll, () => setPhase('waiting')]
                : [INTRO.scroll, () => done.current()];
    const timer = setTimeout(then, wait);
    return () => clearTimeout(timer);
  }, [phase, title, tail]);

  // The line being typed out, and how much of it is out.
  const typing = phase === 'title' ? title : phase === 'next' ? (tail ?? '') : null;
  const [typed, setTyped] = useState({ line: typing, keys: 0 });
  if (typed.line !== typing) setTyped({ line: typing, keys: 0 });
  useEffect(() => {
    if (typing === null) return;
    const timer = setInterval(
      () =>
        setTyped((was) => (was.keys < typing.length ? { line: typing, keys: was.keys + 1 } : was)),
      INTRO.key
    );
    return () => clearInterval(timer);
  }, [typing]);

  // Asked on by a click, the wheel or a key, ahead of the walkthrough's own keys and scrolling.
  const begin = useCallback(() => {
    if (phaseNow.current === 'leaving') return;
    setPhase('leaving');
    left.current?.();
  }, []);
  // The count it came up with, asked before it did, is not an ask.
  const askedBefore = useRef(asked);
  useEffect(() => {
    if (asked === askedBefore.current) return;
    askedBefore.current = asked;
    begin();
  }, [asked, begin]);
  // On by itself the first time only: not when scrolled back up to, nor unseen in another tab, nor with motion reduced;
  // and not before what floats over it is built, however long that takes, or it would never be seen. A pointer held
  // down, turning what floats over it, puts it off until `stay` after it comes up.
  useEffect(() => {
    if (phase !== 'waiting' || returning || !ready || stay === undefined) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hold = () => clearTimeout(timer);
    const wait = () => {
      hold();
      if (!document.hidden) timer = setTimeout(begin, stay);
    };
    wait();
    window.addEventListener('pointerdown', hold, true);
    window.addEventListener('pointerup', wait, true);
    window.addEventListener('pointercancel', wait, true);
    document.addEventListener('visibilitychange', wait);
    return () => {
      hold();
      window.removeEventListener('pointerdown', hold, true);
      window.removeEventListener('pointerup', wait, true);
      window.removeEventListener('pointercancel', wait, true);
      document.removeEventListener('visibilitychange', wait);
    };
  }, [phase, returning, ready, stay, begin]);
  useEffect(() => {
    const ask = (e: Event, forward: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      // Ignore the gesture that brought the intro back, including its remaining momentum.
      if (!forward || phaseNow.current === 'back' || phaseNow.current === 'returning') return;
      begin();
    };
    const onWheel = (e: WheelEvent) => ask(e, e.deltaY > 0);
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"]'
      );
      if (typing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const forward = ['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key);
      const backward = ['ArrowUp', 'ArrowLeft', 'PageUp', 'Home'].includes(e.key);
      if (forward || backward) ask(e, forward);
    };
    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onTouchMove = (e: TouchEvent) => {
      // An upward swipe advances. A downward pull, or the tail of one begun on the
      // first chapter before this intro mounted, keeps the opening screen visible.
      if (e.touches.length !== 1) return;
      ask(e, touchY !== null && touchY - e.touches[0].clientY > 10);
    };
    const options = { capture: true, passive: false };
    window.addEventListener('wheel', onWheel, options);
    window.addEventListener('keydown', onKey, options);
    window.addEventListener('touchstart', onTouchStart, { capture: true, passive: true });
    window.addEventListener('touchmove', onTouchMove, options);
    return () => {
      window.removeEventListener('wheel', onWheel, options);
      window.removeEventListener('keydown', onKey, options);
      window.removeEventListener('touchstart', onTouchStart, true);
      window.removeEventListener('touchmove', onTouchMove, options);
    };
  }, [begin]);

  const up = phase === 'leaving' || phase === 'back';
  // Whether the words that come in at `step` are in yet: in from then on, and while it scrolls.
  const coming = ['hold', 'logo', 'title', 'next'];
  const shown = (step: 'title' | 'next') =>
    !coming.includes(phase) || coming.indexOf(phase) >= coming.indexOf(step);
  const fade = (ms: number, delay = 0) =>
    phase === 'back' ? 'none' : `opacity ${ms}ms ease-out ${delay}ms`;
  // How much of each line is out: none before its turn, typing on its turn, all of it after.
  const out = (step: 'title' | 'next', line: string) =>
    phase === step ? typed.keys : shown(step) ? line.length : 0;
  return (
    <div
      role="presentation"
      data-walkthrough-intro
      onClick={begin}
      className={cn(
        'fixed inset-0 z-[60] flex cursor-pointer flex-col items-center justify-center bg-white stacked:pb-[11vh]',
        phase === 'leaving' && 'pointer-events-none'
      )}
      style={{
        transform: up ? 'translateY(-100%)' : 'none',
        transition: phase === 'back' ? 'none' : SCROLL,
      }}
    >
      <div
        className="mb-[clamp(20px,4vh,40px)]"
        style={{ opacity: phase === 'hold' ? 0 : 1, transition: fade(1200) }}
      >
        <ObiLogo className="block h-[clamp(90px,16vh,150px)] w-auto text-[#002766] stacked:h-[clamp(64px,24vw,130px)] squat:h-[64px]" />
      </div>
      <h1
        aria-label={tail ? `${title} ${tail}` : title}
        className={cn(
          heroClass(true, true),
          'text-primary-9 text-center whitespace-nowrap stacked:px-[20px] stacked:text-balance stacked:whitespace-normal'
        )}
      >
        <Typed
          text={title}
          keys={out('title', title)}
          caret={phase === 'title' || (!tail && shown('title'))}
        />
        {tail && (
          // A blank line before it.
          <em className="mt-[1.12em] block squat:mt-[0.5em]">
            <Typed text={tail} keys={out('next', tail)} caret={phase === 'next'} />
          </em>
        )}
      </h1>
      <div
        className="text-primary-9 absolute bottom-[20vh] flex flex-col items-center gap-[10px] stacked:bottom-[56px] stacked:gap-[4px] squat:hidden"
        style={{
          opacity: phase === 'waiting' || phase === 'leaving' ? 1 : 0,
          transition: fade(700),
        }}
      >
        {foot}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-[22px] w-[22px] animate-bounce"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {base && (
        <div
          className="absolute inset-x-0 bottom-[clamp(20px,4.5vh,44px)] flex justify-center stacked:bottom-[12px]"
          style={{ opacity: shown('next') ? 1 : 0, transition: fade(900, 900) }}
        >
          {base}
        </div>
      )}
    </div>
  );
}

/**
 * `text` typed out to its `keys`th character, with the rest held in place unseen, so that a centred line does
 * not move as it grows; with `caret`, a caret blinking after what is out.
 */
function Typed({ text, keys, caret }: { text: string; keys: number; caret: boolean }) {
  return (
    <span aria-hidden>
      {text.slice(0, keys)}
      {caret && (
        <span className="relative">
          <span className="absolute top-[0.14em] left-[0.04em] h-[0.92em] w-[0.06em] animate-pulse bg-current" />
        </span>
      )}
      <span className="invisible">{text.slice(keys)}</span>
    </span>
  );
}

/** How long a word shared by the intro and the first screen takes to fly across, and the gap between words, ms. */
const FLY = { ms: INTRO.scroll, gap: 45 };
const FLOWN_STYLE = [
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textDecorationLine',
  'textDecorationThickness',
  'textUnderlineOffset',
  'textDecorationColor',
] as const;

/**
 * The words the intro and the first screen share, each marked `data-fly` with one key in both, flown from where
 * they are on the intro to where they come to rest on the first screen as the page scrolls on, one a moment
 * after the other: set as the first screen sets them, scaled to the intro's size and in its colour at first,
 * then on into its own, which are hidden till they land. A word not yet shown on the intro does not fly.
 */
function flyShared(root: HTMLElement, intro: HTMLElement, first: HTMLElement) {
  // The first screen is a page below till the scroll brings it up.
  const below = window.innerHeight;
  const seen = (word: HTMLElement) => {
    let opacity = 1;
    for (let at: HTMLElement | null = word; at && at !== intro; at = at.parentElement) {
      opacity *= Number(getComputedStyle(at).opacity);
    }
    return opacity > 0.5;
  };
  const pairs = Array.from(intro.querySelectorAll<HTMLElement>('[data-fly]'))
    .filter(seen)
    .flatMap((from) => {
      // On the first screen, or anywhere else but the intro, such as a bar fixed over the screens.
      const key = `[data-fly="${from.dataset.fly}"]`;
      const to =
        first.querySelector<HTMLElement>(key) ??
        Array.from(root.querySelectorAll<HTMLElement>(key)).find((word) => !intro.contains(word));
      return to ? [{ from, to }] : [];
    });
  if (!pairs.length) return;
  const layer = document.createElement('div');
  layer.className = 'pointer-events-none fixed inset-0 z-[66]';
  root.appendChild(layer);
  const words = pairs.map(({ from, to }, i) => {
    const source = from.getBoundingClientRect();
    const target = to.getBoundingClientRect();
    // A page below till the scroll brings it up, on the first screen; where it is already, fixed.
    const lift = first.contains(to) ? below : 0;
    const own = getComputedStyle(to);
    const scale = parseFloat(getComputedStyle(from).fontSize) / parseFloat(own.fontSize);
    const word = document.createElement('span');
    word.textContent = to.textContent;
    Object.assign(word.style, {
      position: 'absolute',
      left: `${target.left}px`,
      top: `${target.top - lift}px`,
      whiteSpace: 'nowrap',
      transformOrigin: '0 0',
      color: getComputedStyle(from).color,
      transform: `translate(${source.left - target.left}px, ${source.top - (target.top - lift)}px) scale(${scale})`,
    });
    FLOWN_STYLE.forEach((property) => {
      word.style[property] = own[property];
    });
    layer.appendChild(word);
    from.style.visibility = 'hidden';
    to.style.visibility = 'hidden';
    return { word, color: own.color, delay: i * FLY.gap };
  });
  // Drawn where they start for a frame, then sent on.
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      words.forEach(({ word, color, delay }) => {
        word.style.transition = `transform ${FLY.ms}ms ${SCROLL_EASE} ${delay}ms, color ${FLY.ms}ms ease ${delay}ms`;
        word.style.transform = 'none';
        word.style.color = color;
      })
    )
  );
  window.setTimeout(
    () => {
      pairs.forEach(({ from, to }) => {
        from.style.visibility = '';
        to.style.visibility = '';
      });
      layer.remove();
    },
    FLY.ms + pairs.length * FLY.gap + 60
  );
}

/** A way back or on: a bare chevron, with room round it to be pointed at. */
const ARROW =
  'pointer-events-auto flex size-[40px] items-center justify-center text-primary-9 transition-opacity duration-200 hover:opacity-60 stacked:rounded-full stacked:bg-white/85';

/**
 * A screen back, up at the top of the page, and a screen on, down at its foot, both in the middle: back from
 * the first to the intro where there is one, and on from the last to where the walkthrough leads. Not over
 * the intro. On a phone, the way back gives way to the top bar: a finger takes the page back.
 */
function SlideArrows({
  onUp,
  onDown,
  last,
  shown,
  bottom,
}: {
  /** Null where there is nothing back. */
  onUp: (() => void) | null;
  onDown: () => void;
  last: boolean;
  shown: boolean;
  /** How far up the foot the way on sits, a CSS length, over the usual. */
  bottom?: string;
}) {
  const chevron = (d: string) => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-[26px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
  return (
    <div
      inert={!shown || undefined}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-[clamp(16px,2.6vh,26px)] bottom-[var(--arrows-foot,clamp(16px,2.6vh,26px))] z-[66] flex flex-col items-center justify-between transition-opacity duration-500 stacked:bottom-[36px] squat:hidden max-sm:items-end max-sm:pr-[10px]',
        shown ? 'opacity-100' : 'opacity-0'
      )}
      style={bottom ? ({ '--arrows-foot': bottom } as CSSProperties) : undefined}
    >
      <button
        type="button"
        aria-label="Previous screen"
        onClick={() => onUp?.()}
        className={cn(ARROW, 'max-sm:invisible', !onUp && 'pointer-events-none invisible')}
      >
        {chevron('M6 15l6-6 6 6')}
      </button>
      <button
        type="button"
        aria-label={last ? 'On to your home page' : 'Next screen'}
        onClick={onDown}
        className={ARROW}
      >
        {chevron('M6 9l6 6 6-6')}
      </button>
    </div>
  );
}

/**
 * The chapters as a rail down the right of the page: a tick each, numbered, the one on long, navy and
 * named; all named while the rail is pointed at. Each goes to its chapter.
 */
function SidePager({
  chapters,
  active,
  onGo,
  shown,
}: {
  chapters: readonly IWalkthroughChapter[];
  active: number;
  onGo: (index: number) => void;
  /** Not over the intro, which it would otherwise be over. */
  shown: boolean;
}) {
  return (
    <nav
      aria-label="Chapters"
      inert={!shown || undefined}
      className={cn(
        'group/pager fixed top-1/2 right-[clamp(14px,1.8vw,30px)] z-[66] flex -translate-y-1/2 flex-col items-end gap-[6px] transition-opacity duration-500',
        shown ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      {chapters.map((chapter, index) => {
        const on = index === active;
        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => onGo(index)}
            aria-label={chapter.label}
            aria-current={on ? 'step' : undefined}
            className="group/item flex items-center gap-[10px] py-[5px] outline-none"
          >
            <span
              className={cn(
                'rounded-full bg-white/90 px-[7px] py-[1px] text-[10px] leading-[14px] font-semibold tracking-[0.14em] whitespace-nowrap uppercase transition-[opacity,color] duration-300',
                on
                  ? 'text-primary-9 opacity-100'
                  : 'text-neutral-400 opacity-0 group-hover/item:text-primary-9 group-hover/pager:opacity-100 group-focus-visible/item:opacity-100'
              )}
            >
              <span className="mr-[6px] tabular-nums opacity-60">
                {String(index + 1).padStart(2, '0')}
              </span>
              {chapter.label}
            </span>
            <span
              className={cn(
                'h-[2px] rounded-full transition-[width,background-color] duration-300 ease-out',
                on
                  ? 'bg-primary-9 w-[30px]'
                  : 'group-hover/item:bg-primary-9 group-focus-visible/item:bg-primary-9 w-[14px] bg-neutral-300 group-hover/item:w-[22px]'
              )}
            />
          </button>
        );
      })}
    </nav>
  );
}

/** The chapters as dots, the one on named over them; each goes to its chapter. */
function Progress({
  chapters,
  active,
  onGo,
}: {
  chapters: readonly IWalkthroughChapter[];
  active: number;
  onGo: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Chapters"
      className="absolute bottom-[22px] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-[8px]"
    >
      <span className="text-[10px] leading-[14px] font-semibold tracking-[0.16em] uppercase">
        {chapters[active].label}
      </span>
      <ol className="flex items-center gap-[10px]">
        {chapters.map((chapter, index) => {
          const distance = Math.abs(index - active);
          return (
            <li key={chapter.id} className="flex size-[10px] items-center justify-center">
              <button
                type="button"
                aria-label={chapter.label}
                aria-current={distance === 0 ? 'step' : undefined}
                onClick={() => onGo(index)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  distance === 0 && 'bg-primary-9 size-[8px]',
                  distance === 1 && 'border-primary-9 size-[8px] border bg-white',
                  distance > 1 && 'hover:bg-primary-9 size-[4px] bg-neutral-300'
                )}
              />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
