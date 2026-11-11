'use client';

import { animate } from 'framer-motion';
import Link from 'next/link';
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
import { firstPaintReady, firstPaintShown } from '@/ui/segments/landing/first-paint-handoff';
import { informationFont } from '@/ui/segments/landing/information-font';
import { LANDING_LAID_OUT, LANDING_WAY_IN } from '@/ui/segments/landing/landing-tile-stage';
import { FindOutMore } from '@/ui/segments/landing/layout/find-out-more';
import { HOME_DESIGNS } from '@/ui/segments/project/home-designs';
import { cn } from '@/utils/css-class';

import { AccountFlow, Initials, readDummyAccount } from './account-flow';
import { ChapterFrameBackground } from './chapter-frame-background';
import { CHAPTER_SWITCH, LandingCubeBackdrop } from './landing-cube-backdrop';
import { reverseOf, stopFrom, type TReverse } from './stops';
import { type ChapterPlayback, useChapterPlayback } from './use-chapter-playback';

import type { CSSProperties, ReactNode } from 'react';
import type { THomeDesign } from '@/ui/segments/project/home-designs';
import type { IDummyAccount } from './account-flow';

import pills from '@/ui/segments/landing/cta-pill.module.css';
import publicTour from './public-tour.module.css';

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

/** How much longer a glide takes for each screen past the first, so that a long jump does not take a screen's time per screen, ms. */
const GLIDE_PER_EXTRA_SCREEN_MS = 400;

/** How far a wheel or trackpad must go to turn the page, px; and how long it must then rest before it can again, ms. */
const WHEEL_TURN_PX = 24;
const WHEEL_REST_MS = 180;
/** Keys that move the page: pressing one is taking over the tour from its playback. */
/** How far a finger travels up or down before it is a swipe taking over the tour, px. */
const SWIPE_PX = 12;
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ']);

/** Where a page of `sections` comes to rest: each one's top, and the foot of one taller than the screen. */
function chapterStops(root: HTMLElement, sections: HTMLElement[]): number[] {
  const top = root.getBoundingClientRect().top;
  return sections.flatMap((section) => {
    const box = section.getBoundingClientRect();
    const at = Math.round(box.top - top + root.scrollTop);
    return box.height > root.clientHeight + 2
      ? [at, at + Math.round(box.height - root.clientHeight)]
      : [at];
  });
}

/**
 * The next place to rest, down (1) or up (-1), from `at`, the page's own place unless it is gliding somewhere, when
 * it is where it is going: a turn while it glides goes on from there, rather than to where it is already headed.
 */
function nextStop(
  root: HTMLElement,
  sections: HTMLElement[],
  way: 1 | -1,
  at = root.scrollTop
): number | null {
  return stopFrom(chapterStops(root, sections), at, way);
}

/** Whether the chapter on screen goes on past it that way, to be read through by hand. */
function roomInChapter(root: HTMLElement, sections: HTMLElement[], way: 1 | -1): boolean {
  const top = root.getBoundingClientRect().top;
  const screen = root.clientHeight;
  return sections.some((section) => {
    const box = section.getBoundingClientRect();
    if (box.height <= screen + 2) return false;
    const [above, below] = [box.top - top, box.bottom - top];
    return way > 0 ? above <= 2 && below > screen + 2 : above < -2 && below >= screen - 2;
  });
}

/** Whether something under `target` scrolls by itself and still has room that way. */
function scrollsInside(target: EventTarget | null, root: HTMLElement, way: 1 | -1): boolean {
  for (let at = target as HTMLElement | null; at && at !== root; at = at.parentElement) {
    const { overflowY } = getComputedStyle(at);
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
    const left = way > 0 ? at.scrollHeight - at.clientHeight - at.scrollTop : at.scrollTop;
    if (left > 1) return true;
  }
  return false;
}

/**
 * A walkthrough: the project home as a story told while scrolling, after everyneuron.com, a screen
 * per chapter, the words on the left, and on the right its `stage`, the data the platform holds in
 * its own 3D views, set into the page. Colour-by is the only control over them; a click on a neuron
 * tells what it is. Scrolled past its end, or → on its last chapter, it leads to the home of `end`.
 */
export function Walkthrough<C extends IWalkthroughChapter>({
  chapters,
  stage,
  stageScrolls = false,
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
  /**
   * The right of the page for the chapter on, with where that chapter puts colour-by, a way to another chapter,
   * and whether it is on or next to the chapter on: what is costly to load or run can wait for that.
   */
  stage: (
    chapter: C,
    colorSlot: HTMLElement | null,
    goTo: (id: string) => void,
    active: boolean,
    near: boolean
  ) => ReactNode;
  /** Keep the media in each chapter's scroll container so it travels exactly with its words. */
  stageScrolls?: boolean;
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
    playback: ChapterPlayback;
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
  const stageRef = useRef<HTMLDivElement>(null);
  const sections = useRef<Array<HTMLElement | null>>([]);
  // The scroller's height, a chapter's: until it is measured, the screen less the top menu.
  const [height, setHeight] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const navigationUntil = useRef(0);
  const pendingIntroChapter = useRef<string | null>(null);
  const wheelHeldUntil = useRef(0);
  // Which way the wheel turned the page last, for its momentum to be held; a turn the other way is a new gesture.
  const heldWay = useRef<1 | -1 | 0>(0);
  // How far the wheel has gone against that way while it is held.
  const reversed = useRef<TReverse>({ px: 0, events: 0 });
  // Where the page is gliding to, while it does.
  const glideTarget = useRef<number | null>(null);
  const touchFrom = useRef<{ x: number; y: number } | null>(null);
  const glide = useRef<{ stop: () => void } | null>(null);
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
  // Keep the public landing mounted while it moves upward with the incoming chapter.
  useEffect(() => {
    if (!introContent || !introLeft || introDone) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(finishIntro, reduced ? 0 : INTRO.scroll);
    return () => window.clearTimeout(timer);
  }, [introContent, introLeft, introDone, finishIntro]);

  // On the public landing the logo stands over its words, where the landing marks (`data-landing-logo-at`), and glides
  // up into its corner with the page as the landing goes, and back down with it.
  const logoRef = useRef<HTMLAnchorElement>(null);
  const logoPlaced = useRef(false);
  const logoOnLanding = !!introContent && !introDone && !introLeft;
  // For now it stays in its corner, level with the top bar's buttons, the landing's words beside it (user); with
  // LOGO_OVER_WORDS it stands over them as before.
  // (on wide screens only: on a phone the landing's words sit under its tiles, and the logo stays in its corner)
  const [wideScreen, setWideScreen] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 800px)');
    const update = () => setWideScreen(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const placesLogo = LOGO_OVER_WORDS && logoOnLanding && wideScreen;
  const [logoIn, setLogoIn] = useState(!introContent);
  useEffect(() => {
    if (logoIn) return;
    const frame = requestAnimationFrame(() => setLogoIn(true));
    return () => cancelAnimationFrame(frame);
  }, [logoIn]);
  const [logoPose, setLogoPose] = useState<{
    transform: string;
    glide: boolean;
    // placed with no fade: the page's first HTML already brought it in there (landing-first-paint.tsx)
    atOnce?: boolean;
  } | null>(null);
  // The top bar's buttons come in last on the landing, with its way in.
  const [landingWayIn, setLandingWayIn] = useState(false);
  useEffect(() => {
    const show = () => setLandingWayIn(true);
    window.addEventListener(LANDING_WAY_IN, show);
    return () => window.removeEventListener(LANDING_WAY_IN, show);
  }, []);
  // (for now none on the landing at all: they come in as it goes, user)
  const buttonsWait = logoOnLanding && (HIDE_BUTTONS_ON_LANDING || !landingWayIn);
  useEffect(() => {
    if (!placesLogo) {
      setLogoPose((was) => (was ? { transform: 'none', glide: true } : was));
      // (the first HTML's copy has its logo over the words: it hands over all the same)
      firstPaintReady('logo');
      return;
    }
    const place = (glide: boolean) => {
      const logo = logoRef.current;
      const bar = logo?.offsetParent;
      const at = document.querySelector<HTMLElement>('[data-landing-logo-at]');
      const landing = at?.closest<HTMLElement>('[data-walkthrough-intro]');
      if (!logo || !(bar instanceof HTMLElement) || !at || !landing) return false;
      const box = at.getBoundingClientRect();
      if (!box.height || !logo.offsetHeight) return false;
      // where the mark is with the landing at rest, which it may be on its way back to
      const from = landing.getBoundingClientRect();
      const barBox = bar.getBoundingClientRect();
      const x = box.left - from.left - (barBox.left + logo.offsetLeft);
      const y = box.top - from.top - (barBox.top + logo.offsetTop);
      setLogoPose({
        transform: `translate(${x}px, ${y}px) scale(${box.height / logo.offsetHeight})`,
        glide,
        atOnce: !glide && firstPaintShown(),
      });
      return true;
    };
    let frame = 0;
    const tryPlace = () => {
      if (!place(logoPlaced.current)) {
        frame = requestAnimationFrame(tryPlace);
        return;
      }
      logoPlaced.current = true;
      firstPaintReady('logo');
    };
    tryPlace();
    // again whenever the landing lays itself out anew (its scale), as the mark's own size does not change with it
    const relaid = () => place(false);
    window.addEventListener(LANDING_LAID_OUT, relaid);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(LANDING_LAID_OUT, relaid);
    };
  }, [placesLogo]);

  const leaveIntro = useCallback(() => {
    const intro = root?.querySelector<HTMLElement>('[data-walkthrough-intro]');
    const first = sections.current[0];
    if (root && intro && first) flyShared(root, intro, first);
    setIntroLeft(true);
  }, [root]);
  // A trackpad gesture has many momentum events after its first tick. Keep those
  // from scrolling on while the page is already moving, or just after it stops.
  const holdsWheel = !!introContent || stageScrolls;
  useEffect(() => {
    if (!root || !holdsWheel) return;
    const holdGesture = (event: WheelEvent) => {
      const now = performance.now();
      if (now >= wheelHeldUntil.current) return;
      // Going the other way, and on going, is no momentum of the last turn but the visitor going back: let it
      // through. A stray tick as a trackpad gesture ends is not.
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? root.clientHeight : 1;
      const reverse = reverseOf(reversed.current, event.deltaY * unit, heldWay.current);
      reversed.current = reverse;
      if (reverse.back) {
        wheelHeldUntil.current = 0;
        heldWay.current = 0;
        reversed.current = { px: 0, events: 0 };
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      wheelHeldUntil.current = Math.max(wheelHeldUntil.current, now + WHEEL_REST_MS);
    };
    root.addEventListener('wheel', holdGesture, { passive: false, capture: true });
    return () => root.removeEventListener('wheel', holdGesture, true);
  }, [root, holdsWheel]);

  /** The page taken to a place at the pace of the landing's scroll, which the browser's own cannot be slowed to; how long it takes, ms. */
  const glideTo = useCallback(
    (to: number): number => {
      if (!root) return 0;
      glide.current?.stop();
      glide.current = null;
      glideTarget.current = null;
      const distance = Math.abs(to - root.scrollTop);
      if (distance < 2) return 0;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.scrollTop = to;
        return 0;
      }
      glideTarget.current = to;
      // what moves with a change of chapter starts with it (the tiles behind them)
      window.dispatchEvent(new Event(CHAPTER_SWITCH));
      const extraScreens = Math.max(Math.round(distance / root.clientHeight) - 1, 0);
      const ms = INTRO.scroll + extraScreens * GLIDE_PER_EXTRA_SCREEN_MS;
      glide.current = animate(root.scrollTop, to, {
        duration: ms / 1000,
        ease: GLIDE_EASE,
        onUpdate: (at) => {
          root.scrollTop = at;
        },
        onComplete: () => {
          glide.current = null;
          glideTarget.current = null;
        },
      });
      return ms;
    },
    [root]
  );
  useEffect(() => () => glide.current?.stop(), []);

  const placedSections = useCallback(
    () => sections.current.filter((section): section is HTMLElement => section !== null),
    []
  );

  /** On to the next place to rest, down or up; how long it takes, ms, or null if the page ends first. */
  const turnPage = useCallback(
    (way: 1 | -1): number | null => {
      if (!root) return null;
      const to = nextStop(root, placedSections(), way, glideTarget.current ?? root.scrollTop);
      if (to === null) return null;
      const ms = glideTo(to);
      navigationUntil.current = Date.now() + Math.max(ms, 1000);
      return ms;
    },
    [root, placedSections, glideTo]
  );

  // What floats over the intro built, for the intro to start with it.
  const [floated, setFloated] = useState(0);
  const floatReady = useCallback(() => setFloated((built) => built + 1), []);
  // Back to the intro from the first screen, by the wheel, a key or its arrow.
  const ownLanding = !!introContent;
  const backToIntro = useCallback(() => {
    setIntroState('returning');
    // A host's own landing is drawn above the page first, where it left for, to come down with it.
    if (ownLanding) requestAnimationFrame(() => requestAnimationFrame(() => setIntroLeft(false)));
    else setIntroLeft(false);
  }, [ownLanding]);
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
      const now = performance.now();
      const rested = now - topSince > AT_TOP_MS && now >= wheelHeldUntil.current;
      if (e.deltaY < 0 && root.scrollTop <= 1 && rested) back();
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
    if (!introContent && active === chapters.length) finish();
  }, [active, finish, chapters.length, introContent]);

  const go = useCallback(
    (index: number) => {
      navigationUntil.current = Date.now() + 1000;
      if (index >= chapters.length) {
        if (introContent) return;
        finish();
        return;
      }
      const section = sections.current[Math.max(0, index)];
      if (stageScrolls && root && section) {
        const offset = section.getBoundingClientRect().top - root.getBoundingClientRect().top;
        const ms = glideTo(Math.round(offset + root.scrollTop));
        navigationUntil.current = Date.now() + Math.max(ms, 1000);
        return;
      }
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [finish, chapters.length, introContent, stageScrolls, root, glideTo]
  );

  const goTo = useCallback(
    (id: string) => {
      const index = chapters.findIndex((chapter) => chapter.id === id);
      if (index >= 0) go(index);
    },
    [chapters, go]
  );

  useEffect(() => {
    if (!introDone || !pendingIntroChapter.current) return;
    const id = pendingIntroChapter.current;
    pendingIntroChapter.current = null;
    const frame = requestAnimationFrame(() => goTo(id));
    return () => cancelAnimationFrame(frame);
  }, [introDone, goTo]);

  // The tour settles on a screen. Where the page turns by the gesture, this is only for what is left between two:
  // the scrollbar let go of, say, or a fling that ran out of a tall chapter.
  useEffect(() => {
    if (!fullscreen || !root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = () => {
      if (stageScrolls && (glide.current || !introDone)) return;
      const now = root.scrollTop;
      const top = root.getBoundingClientRect().top;
      const screen = root.clientHeight;
      const placed = placedSections();
      // Taller than the screen, as on a small phone, a chapter is read down through, its foot a stop as well.
      const boxes = placed.map((section) => section.getBoundingClientRect());
      if (boxes.some((box) => box.top - top < 0 && box.bottom - top >= screen - 2)) return;
      const stops = chapterStops(root, placed);
      if (stops.length === 0 || stops.some((stop) => Math.abs(stop - now) <= 2)) return;
      const nearest = stops.reduce((best, stop) =>
        Math.abs(stop - now) < Math.abs(best - now) ? stop : best
      );
      if (stageScrolls) glideTo(nearest);
      else root.scrollTo({ top: nearest, behavior: 'smooth' });
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
  }, [fullscreen, root, stageScrolls, introDone, placedSections, glideTo]);

  // ← and → go a chapter back and on, as on everyneuron; where the page turns by itself, up and down and the
  // like do too, unless a tall chapter has more to read that way.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const typing = (e.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"]'
      );
      if (typing) return;
      if (e.key === 'ArrowRight') go(active + 1);
      else if (e.key === 'ArrowLeft') go(active - 1);
      else if (stageScrolls && introDone && root && e.key === 'Home') go(0);
      else if (stageScrolls && introDone && root && e.key === 'End') go(chapters.length - 1);
      else if (stageScrolls && introDone && root) {
        const pressed = (e.target as HTMLElement | null)?.closest('a, button');
        const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !pressed);
        const up = e.key === 'ArrowUp' || e.key === 'PageUp';
        if (!down && !up) return;
        const way = down ? 1 : -1;
        if (roomInChapter(root, placedSections(), way)) return;
        if (!e.repeat && turnPage(way) === null) return;
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, go, stageScrolls, introDone, root, chapters.length, placedSections, turnPage]);

  // Where the media scrolls with its words, a gesture turns the page, at the same pace whatever it was: one chapter
  // for one flick of the wheel or the finger, however much momentum it has. A sign-up over the page keeps its own.
  useEffect(() => {
    if (!root || !stageScrolls || !introDone || accountFlow) return;
    let travelled = 0;
    let lastWheel = 0;
    let lastWay = 0;
    let readingUntil = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.deltaY === 0 || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const now = performance.now();
      if (now < wheelHeldUntil.current) return;
      const way = e.deltaY > 0 ? 1 : -1;
      if (scrollsInside(e.target, root, way) || roomInChapter(root, placedSections(), way)) {
        readingUntil = now + WHEEL_REST_MS;
        return;
      }
      // The tail of a gesture that read to the end of a tall chapter is not a new one.
      if (now < readingUntil) {
        e.preventDefault();
        readingUntil = now + WHEEL_REST_MS;
        return;
      }
      if (nextStop(root, placedSections(), way, glideTarget.current ?? root.scrollTop) === null)
        return;
      e.preventDefault();
      if (now - lastWheel > 300 || way !== lastWay) travelled = 0;
      lastWheel = now;
      lastWay = way;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? root.clientHeight : 1;
      travelled += Math.abs(e.deltaY) * unit;
      if (travelled < WHEEL_TURN_PX) return;
      travelled = 0;
      wheelHeldUntil.current = now + (turnPage(way) ?? 0) + WHEEL_REST_MS;
      heldWay.current = way;
      reversed.current = { px: 0, events: 0 };
    };
    let from: { x: number; y: number } | null = null;
    let paging = false;
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches.length === 1 ? e.touches[0] : null;
      from = touch && { x: touch.clientX, y: touch.clientY };
      paging = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!from) return;
      if (!paging) {
        const [dx, dy] = [e.touches[0].clientX - from.x, e.touches[0].clientY - from.y];
        const way = dy < 0 ? 1 : -1;
        if (
          Math.abs(dx) > Math.abs(dy) ||
          scrollsInside(e.target, root, way) ||
          roomInChapter(root, placedSections(), way) ||
          nextStop(root, placedSections(), way) === null
        ) {
          from = null;
          return;
        }
        paging = true;
      }
      if (e.cancelable) e.preventDefault();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (from && paging) {
        const dy = e.changedTouches[0].clientY - from.y;
        if (Math.abs(dy) > PULL_PX / 2) turnPage(dy < 0 ? 1 : -1);
      }
      from = null;
      paging = false;
    };
    const held = { passive: false, capture: true };
    root.addEventListener('wheel', onWheel, held);
    root.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    root.addEventListener('touchmove', onTouchMove, held);
    root.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    return () => {
      root.removeEventListener('wheel', onWheel, true);
      root.removeEventListener('touchstart', onTouchStart, true);
      root.removeEventListener('touchmove', onTouchMove, true);
      root.removeEventListener('touchend', onTouchEnd, true);
    };
  }, [root, stageScrolls, introDone, accountFlow, placedSections, turnPage]);

  // The runway past the end is no chapter: the last one stays on while it is crossed.
  const on = Math.min(active, chapters.length - 1);
  const chapter = chapters[on];
  const advanceChapter = useCallback(() => {
    if (Date.now() < navigationUntil.current) return;
    if (stageScrolls && root) {
      const section = sections.current[on];
      if (
        !section ||
        Math.abs(section.getBoundingClientRect().top - root.getBoundingClientRect().top) > 4
      )
        return;
    }
    if (on < chapters.length - 1) go(on + 1);
  }, [on, chapters.length, go, stageScrolls, root]);
  const playback = useChapterPlayback({
    stage: stageRef,
    chapterId: chapter.id,
    enabled: !!introContent && introDone,
    onComplete: advanceChapter,
  });
  // While the intro is up, the first screen waits a page below it, and scrolls up as it leaves.
  const underIntro: CSSProperties = LANDING_PEELS
    ? {
        transform: intro && !introDone && !introLeft ? 'translateY(100vh)' : 'none',
        transition: SCROLL,
      }
    : {
        opacity: intro && !introDone && !introLeft ? 0 : 1,
        transition: `opacity ${INTRO.scroll}ms ease ${INTRO.scroll / 4}ms`,
      };

  const page = (
    <EnteredContext.Provider value={introDone || introLeft}>
      <ActionsContext.Provider value={actions}>
        <BareViewers>
          <div
            ref={setRoot}
            onWheelCapture={() => {
              navigationUntil.current = Date.now() + 1000;
              // Not the tail of the gesture that left the landing: that one starts the tour.
              if (introDone && performance.now() > wheelHeldUntil.current) playback.hold();
            }}
            onTouchStartCapture={(event) => {
              navigationUntil.current = Date.now() + 1000;
              const touch = event.touches[0];
              touchFrom.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            // An up or down swipe, not a tap (tapping the play button must not first stop it) nor a
            // sideways one (the chapter bar scrolls sideways on a phone).
            onTouchMoveCapture={(event) => {
              const from = touchFrom.current;
              const touch = event.touches[0];
              if (!introDone || !from || !touch) return;
              const dx = Math.abs(touch.clientX - from.x);
              const dy = Math.abs(touch.clientY - from.y);
              if (dy > SWIPE_PX && dy > dx) playback.hold();
            }}
            onKeyDownCapture={(event) => {
              navigationUntil.current = Date.now() + 1000;
              if (introDone && SCROLL_KEYS.has(event.key)) playback.hold();
            }}
            className={cn(
              'text-primary-9 bg-white transition-[opacity,scale] ease-in-out',
              fullscreen
                ? 'fixed inset-0 z-[45] overflow-x-hidden overflow-y-auto overscroll-y-contain'
                : 'relative min-h-full',
              // Lifted away, the home under it uncovered.
              finishing && 'pointer-events-none scale-[1.04] opacity-0',
              learnFonts,
              introContent && informationFont.variable,
              introContent && publicTour.publicTour
            )}
            data-public-tour={introContent ? true : undefined}
            style={
              {
                '--chapter-h': height ? `${height}px` : 'calc(100vh - 6rem)',
                // Held upright, a stage's video across the page, under the top bar, lower the taller the screen.
                '--stage-video-h':
                  'min(calc((100vw - 32px) * 0.5625), calc(var(--chapter-h) * 0.32))',
                '--stage-video-top': 'max(60px, calc(var(--chapter-h) * 0.35 - 160px))',
                fontFamily: introContent
                  ? informationFont.style.fontFamily
                  : 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
                transitionDuration: `${FINISH_MS}ms`,
              } as CSSProperties
            }
          >
            {/* behind the chapters: the first landing's frame of tiles, or, with LANDING_CUBES_BEHIND_CHAPTERS, the
                landing's own tiles where they stood */}
            {introContent &&
              (LANDING_CUBES_BEHIND_CHAPTERS ? (
                <LandingCubeBackdrop active={introDone || introLeft} />
              ) : (
                <ChapterFrameBackground active={introDone || introLeft} />
              ))}
            {floating?.({
              entered: introDone || introLeft,
              revealed: introDone,
              chapter: on,
              enter: askEnter,
              ready: floatReady,
              // Picking a chapter by hand is taking over the tour.
              goTo: (id) => {
                playback.hold();
                goTo(id);
              },
              playback,
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
            {intro && !introDone && introContent && (
              <div
                className={publicTour.landingTransition}
                data-leaving={introLeft || undefined}
                style={{ '--landing-exit-ms': `${INTRO.scroll}ms` } as CSSProperties}
                inert={introLeft || undefined}
              >
                {introContent({
                  continue: () => {
                    wheelHeldUntil.current = performance.now() + INTRO.scroll + 450;
                    root?.scrollTo({ top: 0, behavior: 'instant' });
                    setIntroLeft(true);
                  },
                  goTo: (id) => {
                    pendingIntroChapter.current = id;
                    setIntroLeft(true);
                  },
                })}
              </div>
            )}
            {/* The stage's scenes take the pointer, unless one lets it through to what floats under it. */}
            <div
              ref={stageScrolls ? undefined : stageRef}
              className="pointer-events-none sticky top-0 h-(--chapter-h) overflow-hidden"
              style={underIntro}
            >
              {!stageScrolls && stage(chapter, colorSlot, goTo, true, true)}
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
                onDown={introContent && on === chapters.length - 1 ? null : () => go(on + 1)}
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
                  introContent && 'bg-transparent pb-[14px]'
                )}
              >
                <Link
                  ref={logoRef}
                  href="/"
                  aria-label="Open Brain Institute homepage"
                  data-walkthrough-logo
                  style={
                    logoPose
                      ? {
                          transform: logoPose.transform,
                          transformOrigin: '0 0',
                          // it fades in with the landing's words, first of all
                          transition: logoPose.glide
                            ? `transform ${INTRO.scroll}ms ${SCROLL_EASE}, opacity 900ms ease`
                            : logoPose.atOnce
                              ? 'none'
                              : 'opacity 900ms ease',
                        }
                      : // not shown in the corner for a frame before it is placed over the landing's words; in its
                        // corner, faded in first of all
                        {
                          opacity: placesLogo || !logoIn ? 0 : undefined,
                          transition: 'opacity 900ms ease',
                        }
                  }
                  onClick={(event) => {
                    if (!introContent) return;
                    event.preventDefault();
                    root?.scrollTo({ top: 0, behavior: 'instant' });
                    backToIntro();
                  }}
                  className={cn(
                    'pointer-events-auto inline-flex min-h-[44px] shrink-0 items-center rounded-sm transition-opacity duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#183f8b]',
                    introDone || introContent ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <ObiLogo className="block h-[clamp(44px,5vh,56px)] w-auto text-[#002766] max-sm:h-[38px] squat:h-[36px]" />
                </Link>
                <div
                  className="pointer-events-auto flex items-center gap-[20px] max-sm:gap-[10px]"
                  style={{
                    opacity: buttonsWait ? 0 : 1,
                    transition: 'opacity 700ms ease',
                    pointerEvents: buttonsWait ? 'none' : undefined,
                  }}
                >
                  <FindOutMore
                    shown={introDone || !!introContent}
                    informationTypography={!!introContent}
                  />
                  {/* For now, the home it leads to, uncovered as the walkthrough lifts away. */}
                  <button type="button" onClick={finish} className={cn(pills.pill, pills.header)}>
                    <span className="sm:hidden">Enter platform</span>
                    <span className="max-sm:hidden">Enter the platform</span>
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
              ref={stageScrolls ? stageRef : undefined}
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
                    'relative flex min-h-(--chapter-h)',
                    chapter.wide
                      ? 'items-start'
                      : chapter.top
                        ? 'items-end beside:items-start'
                        : 'items-end beside:items-center'
                  )}
                >
                  {stageScrolls && (
                    <div
                      data-chapter-stage
                      className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                      {stage(
                        chapter,
                        index === on ? colorSlot : null,
                        goTo,
                        index === on,
                        Math.abs(index - on) <= 1
                      )}
                    </div>
                  )}
                  <ChapterText
                    chapter={chapter}
                    on={index === on}
                    bold={bold}
                    first={index === 0}
                    firstClass={firstTitleClass}
                    onColorSlot={setColorSlot}
                    publicOpening={!!introContent}
                    scrollsWithStage={stageScrolls}
                  />
                </section>
              ))}
              {/* Past the last chapter, the way on to the home. */}
              {!introContent && (
                <section
                  data-index={chapters.length}
                  ref={(section) => {
                    sections.current[chapters.length] = section;
                  }}
                  className="h-[60vh]"
                />
              )}
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
  publicOpening = false,
  scrollsWithStage = false,
}: {
  chapter: IWalkthroughChapter;
  on: boolean;
  bold: boolean;
  /** The first chapter's: its title is where the intro's comes to rest. */
  first: boolean;
  /** The class its title is set in, where it is the first chapter's. */
  firstClass?: string;
  onColorSlot: (slot: HTMLElement | null) => void;
  publicOpening?: boolean;
  scrollsWithStage?: boolean;
}) {
  const { kicker, title, hero, body, colorBy, after, wide, titleClass, column } = chapter;
  return (
    <div
      inert={!on || undefined}
      data-chapter-text={chapter.id}
      className={cn(
        'relative flex w-full flex-col gap-[18px]',
        !scrollsWithStage && 'transition-[opacity,translate] duration-700 ease-out',
        wide
          ? 'px-[clamp(20px,5vw,88px)] pt-[clamp(100px,14vh,150px)] beside:max-w-[1400px]'
          : cn(
              'bg-white/90 px-[20px] pt-[20px] pb-[88px]',
              'beside:w-[38%] beside:max-w-[540px] beside:bg-transparent beside:py-[72px] beside:pr-0 beside:pl-[clamp(32px,5vw,88px)]'
            ),
        scrollsWithStage
          ? on
            ? 'pointer-events-auto'
            : 'pointer-events-none'
          : on
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'translate-y-[24px] opacity-0',
        column,
        publicOpening && publicTour.publicText
      )}
    >
      {kicker && !publicOpening && (
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
      {kicker && publicOpening && <p data-chapter-kicker>{kicker}</p>}
      {body && (
        <div
          data-chapter-body
          className="flex flex-col gap-[12px] text-[14px] leading-[1.6] text-neutral-600"
        >
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
const GLIDE_EASE = [0.65, 0, 0.35, 1] as const;
const SCROLL_EASE = `cubic-bezier(${GLIDE_EASE.join(', ')})`;
/** The page scrolling on from the intro to the first screen, or back. */
const SCROLL = `transform ${INTRO.scroll}ms ${SCROLL_EASE}`;
/** Whether the logo stands over the landing's words, gliding to its corner as the landing goes; else it stays there. */
const LOGO_OVER_WORDS = true;
/** Whether the top bar's buttons stay hidden over the landing, coming in as it goes; else they come in last on it. */
const HIDE_BUTTONS_ON_LANDING = false;
/** Whether the landing goes up off the page as the first chapter comes up under it; else it fades over the same tiles. */
const LANDING_PEELS = false;
/** Whether the landing's own tiles stay on behind the chapters (landing-cube-backdrop.tsx); else the frame background. */
const LANDING_CUBES_BEHIND_CHAPTERS = false;

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
  'pointer-events-auto flex size-[40px] items-center justify-center max-sm:size-[44px] text-primary-9 transition-opacity duration-200 hover:opacity-60 stacked:rounded-full stacked:bg-white/85';

/**
 * A screen back, up at the top of the page, and a screen on, down at its foot, both in the middle: back from
 * the first to the intro where there is one, and on from the last to where the walkthrough leads.
 * The upper chevron sits below the header so its white background cannot hide it.
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
  onDown: (() => void) | null;
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
        'pointer-events-none fixed inset-x-0 top-[clamp(84px,12vh,100px)] bottom-[var(--arrows-foot,clamp(16px,2.6vh,26px))] z-[66] flex flex-col items-center justify-between transition-opacity duration-500 stacked:bottom-[36px] max-sm:top-[70px] squat:top-[58px]',
        shown ? 'opacity-100' : 'opacity-0'
      )}
      style={bottom ? ({ '--arrows-foot': bottom } as CSSProperties) : undefined}
    >
      <button
        type="button"
        aria-label="Previous screen"
        onClick={() => onUp?.()}
        className={cn(ARROW, !onUp && 'pointer-events-none invisible')}
      >
        {chevron('M6 15l6-6 6 6')}
      </button>
      <button
        type="button"
        aria-label={last ? 'On to your home page' : 'Next screen'}
        onClick={() => onDown?.()}
        className={cn(ARROW, !onDown && 'pointer-events-none invisible')}
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
