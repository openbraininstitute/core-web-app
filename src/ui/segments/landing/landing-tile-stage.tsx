'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { firstPaintReady, firstPaintShown, wordsBegan } from './first-paint-handoff';
import { LANDING_MODELS as FEATURES } from './landing-models';

import styles from './landing-tile-stage.module.css';

/** Sent on the window each time the landing lays itself out anew, for what is placed by it (the page's logo). */
export const LANDING_LAID_OUT = 'landing-laid-out';
/** The seed the landing's tiles are laid out from, this page load: the chapters' backdrop lays out the same. */
let seed: number | null = null;
export const landingSeed = () => (seed ??= Math.floor(Math.random() * 2 ** 31));

/** The landing's renderer while it is up, for the chapters' backdrop to take its white tiles from as it goes. */
type Smalls = Array<{ i: number; x: number; y: number; r0: number; lift: number; order: number }>;
let landingSmalls: (() => Smalls) | null = null;
export const landingSmallsNow = (): Smalls | null => landingSmalls?.() ?? null;

/** Sent on the window as the landing's way in shows, last of its opening, for what comes in with it. */
export const LANDING_WAY_IN = 'landing-way-in';
const wayIn = () => window.dispatchEvent(new Event(LANDING_WAY_IN));

/** How long after the words start coming in "Try it now" does, ms (with the logo and words, user; and in the
 * page's first HTML: landing-first-paint.module.css). */
const CTA_AFTER_WORDS = 300;

/** How long each film stays beside the field before the next comes, ms. */
const FILM_MS = 8000;

/** Reserved space above the mobile artwork for the tagline, CTA and credit message. */
const PHONE_COPY_HEIGHT = 180;

/** The supplied landing composition, with accessible controls and a stacked phone layout. */
export function LandingTileStage({
  scene,
  reduced,
  visible,
  onSelect,
  onInteraction = () => {},
}: {
  scene: number;
  reduced: boolean;
  visible: boolean;
  onSelect: (index: number) => void;
  onInteraction?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const picks = useRef<HTMLDivElement>(null);
  const engine = useRef<{
    show: (index: number) => void;
    setVisible: (visible: boolean) => void;
    selectFeature: (index: number) => void;
    smallsNow: () => Smalls;
    dispose: () => void;
  } | null>(null);
  const latest = useRef({ scene, onSelect, onInteraction, visible });
  latest.current = { scene, onSelect, onInteraction, visible };
  // Drawn only while on screen too: the drift and the loops would otherwise go on under the chapters.
  const onScreen = useRef(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [phoneLayout, setPhoneLayout] = useState<boolean | null>(null);
  // already in when the page's first HTML brought it in with the words (landing-first-paint.tsx)
  const [ctaState, setCtaState] = useState(() => (firstPaintShown() ? 'enter' : 'waiting'));
  // The chosen one beside the field comes last in the opening, after the words and the tiles.
  const [chosenShown, setChosenShown] = useState(false);
  // (drawn in the browser alone, inside the walkthrough's portal, so the page can be asked)
  const [firstPainted] = useState(firstPaintShown);
  const headline = useRef<HTMLHeadingElement>(null);
  useEffect(() => firstPaintReady('words'), []);

  // "Try it now" comes in with the logo and words (user), then pulses.
  useEffect(() => {
    if (reduced) {
      setCtaState('alive');
      return;
    }
    const began = wordsBegan(headline.current?.querySelector('span'));
    const after = (ms: number) => Math.max(0, began + ms - performance.now());
    const entrance = window.setTimeout(
      () => setCtaState((state) => (state === 'waiting' ? 'enter' : state)),
      after(CTA_AFTER_WORDS)
    );
    const pulse = window.setTimeout(() => setCtaState('alive'), after(CTA_AFTER_WORDS + 1750));
    return () => {
      window.clearTimeout(entrance);
      window.clearTimeout(pulse);
    };
  }, [reduced]);

  // What comes in with the way in elsewhere (the chapters, the arrow down) still comes last of all: once the
  // chosen one has grown into its place beside the field.
  useEffect(() => {
    if (chosenShown || failed) wayIn();
  }, [chosenShown, failed]);

  useEffect(() => {
    const container = host.current;
    const composition = stage.current;
    const surface = canvas.current;
    const controls = picks.current;
    if (!container || !composition || !surface || !controls) return;
    let disposed = false;
    // (laid out once, when the renderer is made)
    const opened = container.getBoundingClientRect();
    if (phoneLayout === null) {
      setPhoneLayout(opened.width < 800);
      return;
    }
    const phone = phoneLayout;
    const stageH = 1080;
    composition.style.setProperty('--phone-stage-h', String(stageH));
    const fitStage = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 800 !== phone) {
        setPhoneLayout(width < 800);
        return;
      }
      // Keep CSS first-paint sizing, then resolve the scale to a number. Safari can
      // accept the trig expression in CSS.supports while miscomputing container units.
      if (phone) {
        composition.style.left = '0px';
        composition.style.top = '0px';
        const scale = Math.min(width / 1000, (height - PHONE_COPY_HEIGHT - 48) / stageH);
        composition.style.setProperty('--stage-scale', String(Math.max(0.01, scale)));
      } else {
        const scale = Math.max(0.01, Math.min(width / 1920, height / stageH));
        composition.style.setProperty('--stage-scale', String(scale));
        composition.style.left = `${(width / scale - 1920) / 2}px`;
        composition.style.top = `${(height / scale - stageH) / 2}px`;
      }
      window.dispatchEvent(new Event(LANDING_LAID_OUT));
      placeLabel();
    };
    // the films' name level with the chapters' along the foot (fixed to the window's foot, the stage scaled):
    // in the stage's own px
    const placeLabel = () => {
      const word = container
        .closest('[data-walkthrough-intro]')
        ?.querySelector('nav[aria-label="Platform sections"] [data-fly]');
      if (!word || phone) return;
      const at = word.getBoundingClientRect(),
        stageAt = composition.getBoundingClientRect();
      // (desktop) the stage's scale is in its CSS now, not set here: read off its drawn width, 1920 of its own px
      const scale = stageAt.width / 1920 || 1;
      if (!at.height) return;
      composition.style.setProperty(
        '--label-y',
        `${(at.top + at.height / 2 - stageAt.top) / scale}px`
      );
    };
    window.addEventListener(LANDING_WAY_IN, placeLabel);
    fitStage();
    const resize = new ResizeObserver(fitStage);
    resize.observe(container);
    const seen = new IntersectionObserver(([entry]) => {
      onScreen.current = entry?.isIntersecting ?? true;
      engine.current?.setVisible(latest.current.visible && onScreen.current);
    });
    seen.observe(container);
    void import('./landing-tile-renderer')
      .then(({ createLandingTileRenderer }) => {
        if (disposed) return;
        try {
          engine.current = createLandingTileRenderer(surface, controls, {
            initialIndex: latest.current.scene,
            seed: landingSeed(),
            // the tiles coming in with the logo and words (user)
            introAt: wordsBegan(headline.current?.querySelector('span')),
            reduced,
            textInField: phone,
            // beside the field; on a phone above it (user: "the selected model above the small examples")
            heroBeside: true,
            heroAbove: phone,
            // this version: the field white, the films only beside it, one at a time
            whiteField: true,
            phoneStageH: stageH,
            phoneFieldWidth: phone
              ? container.clientWidth /
                (Number(composition.style.getPropertyValue('--stage-scale')) || 1)
              : undefined,
            onShowChosen: () => {
              if (!disposed) setChosenShown(true);
            },
            onSelect: (index: number) => latest.current.onSelect(index),
            onInteraction: () => latest.current.onInteraction(),
            onReady: () => {
              if (!disposed) setReady(true);
            },
            onError: () => {
              if (!disposed) setFailed(true);
            },
          });
          engine.current.setVisible(latest.current.visible && onScreen.current);
          const own = engine.current;
          landingSmalls = () => own.smallsNow();
        } catch {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      landingSmalls = null;
      engine.current?.dispose();
      engine.current = null;
      resize.disconnect();
      seen.disconnect();
      window.removeEventListener(LANDING_WAY_IN, placeLabel);
    };
  }, [reduced, phoneLayout]);

  useEffect(() => engine.current?.setVisible(visible && onScreen.current), [visible]);
  useEffect(() => engine.current?.selectFeature(scene), [scene]);

  // The films beside the field, one after another in a loop, each FILM_MS; none with reduced motion.
  useEffect(() => {
    if (!chosenShown || reduced || !visible) return;
    const timer = window.setTimeout(
      () => engine.current?.show((scene + 1) % FEATURES.length),
      FILM_MS
    );
    return () => window.clearTimeout(timer);
  }, [chosenShown, reduced, visible, scene]);

  return (
    <div ref={host} className={styles.host} data-tile-landing data-ready={ready || failed}>
      <div ref={stage} className={styles.stage}>
        <canvas ref={canvas} className={styles.tiles} />
        <div ref={picks} className={styles.picks} />
        {/* Where the page's logo stands while the landing is up (the walkthrough moves it here). */}
        <span className={styles.logoAt} data-landing-logo-at aria-hidden="true" />
        <h1
          ref={headline}
          className={styles.headline}
          data-first-painted={firstPainted || undefined}
        >
          <span>Explore, Build and Simulate</span>
          <span>Digital Brain Models.</span>
        </h1>
        <div className={styles.actionRow}>
          <span className={styles.line} aria-hidden="true" />
          <p className={styles.label} data-testid="science-caption" aria-live="polite" key={scene}>
            {FEATURES[scene].label}
          </p>
          <span className={styles.line} aria-hidden="true" />
          <div className={styles.ctaGroup}>
            <Link
              className={styles.cta}
              data-cta-state={ctaState}
              data-landing-cta
              aria-describedby="landing-free-offer"
              href="/app/virtual-lab"
            >
              Try it now
            </Link>
            <p id="landing-free-offer" className={styles.reassurance}>
              Start free · 100 credits included
            </p>
          </div>
        </div>
        {/* Under the field, over the chapters along the foot. */}
        <p className={styles.tagline} data-shown={chosenShown}>
          Neuroscience at the speed of thought
        </p>
      </div>
    </div>
  );
}
