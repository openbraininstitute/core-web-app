'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { firstPaintReady, firstPaintShown, wordsBegan } from './first-paint-handoff';

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

// In the renderer's order (landing-tile-renderer.js FEATURES), which draws them; here for their names.
const FEATURES = [
  {
    label: 'Simulate whole brains',
    alt: "The male fly's brain and nerve cord, lit as its model's neurons fire",
    caption: { kicker: 'Simulate', text: 'Whole brain model of the Fly Central Nervous System' },
  },
  { label: 'Simulate activity', alt: 'Simulated cortical microcircuit, its neurons firing' },
  { label: 'Explore data', alt: 'Reconstructed fly neurons' },
  { label: 'Build models', alt: 'Whole-brain model' },
  { label: 'Virtual labs', alt: 'Brain atlas' },
  {
    label: 'Skeletonize meshes',
    alt: "A neuron's EM mesh, its spines coloured by their distance from the soma",
  },
  {
    label: 'Skeletonize morphologies and extract spines',
    alt: 'Riding down a dendrite past its spines, coloured by their distance from the soma',
  },
];

/** How long after the chosen one starts growing into its place beside the field the way in comes, ms. */
const CTA_AFTER_CHOSEN = 0;

/** The supplied landing composition, with accessible controls and a stacked phone layout. */
export function LandingTileStage({
  scene,
  reduced,
  visible,
  onSelect,
  onInteraction,
}: {
  scene: number;
  reduced: boolean;
  visible: boolean;
  onSelect: (index: number) => void;
  onInteraction: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const picks = useRef<HTMLDivElement>(null);
  const engine = useRef<{
    setVisible: (visible: boolean) => void;
    smallsNow: () => Smalls;
    dispose: () => void;
  } | null>(null);
  const latest = useRef({ scene, onSelect, onInteraction, visible });
  latest.current = { scene, onSelect, onInteraction, visible };
  // Drawn only while on screen too: the drift and the loops would otherwise go on under the chapters.
  const onScreen = useRef(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ctaState, setCtaState] = useState('waiting');
  // The chosen one beside the field comes last in the opening, after the words and the tiles.
  const [chosenShown, setChosenShown] = useState(false);
  // (drawn in the browser alone, inside the walkthrough's portal, so the page can be asked)
  const [firstPainted] = useState(firstPaintShown);
  const headline = useRef<HTMLHeadingElement>(null);
  useEffect(() => firstPaintReady('words'), []);

  // The way in comes last of all: once the chosen one has grown into its place beside the field.
  useEffect(() => {
    if (!chosenShown && !failed) return;
    if (reduced) {
      setCtaState('alive');
      wayIn();
      return;
    }
    const entrance = window.setTimeout(
      () => {
        setCtaState('enter');
        wayIn();
      },
      failed ? 0 : CTA_AFTER_CHOSEN
    );
    const pulse = window.setTimeout(
      () => setCtaState('alive'),
      (failed ? 0 : CTA_AFTER_CHOSEN) + 1750
    );
    return () => {
      window.clearTimeout(entrance);
      window.clearTimeout(pulse);
    };
  }, [chosenShown, failed, reduced]);

  useEffect(() => {
    const container = host.current;
    const composition = stage.current;
    const surface = canvas.current;
    const controls = picks.current;
    if (!container || !composition || !surface || !controls) return;
    let disposed = false;
    const resize = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      const phone = width < 800;
      const scale = phone ? Math.min(width / 1000, 0.39) : Math.min(width / 1920, height / 1080);
      composition.style.setProperty('--stage-scale', String(scale));
      if (!phone) {
        // in the stage's own px, which its zoom scales
        composition.style.left = `${(width - 1920 * scale) / 2 / scale}px`;
        composition.style.top = `${(height - 1080 * scale) / 2 / scale}px`;
      } else {
        composition.style.left = '0px';
        composition.style.top = '0px';
      }
      window.dispatchEvent(new Event(LANDING_LAID_OUT));
    });
    resize.observe(container);
    const seen = new IntersectionObserver(([entry]) => {
      onScreen.current = entry?.isIntersecting ?? true;
      engine.current?.setVisible(latest.current.visible && onScreen.current);
    });
    seen.observe(container);
    const phone = container.getBoundingClientRect().width < 800;
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
            // phones have no room beside the field: there the big tile on the crescent shows the chosen one
            heroBeside: !phone,
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
    };
  }, [reduced]);

  useEffect(() => engine.current?.setVisible(visible && onScreen.current), [visible]);

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
          <span>Neuroscience at the</span>
          <span>Speed of Thought</span>
        </h1>
        <div className={styles.actionRow}>
          <span className={styles.line} aria-hidden="true" />
          <p className={styles.label} data-testid="science-caption" aria-live="polite" key={scene}>
            {FEATURES[scene].label}
          </p>
          <span className={styles.line} aria-hidden="true" />
          <div className={styles.ctaGroup}>
            <Link className={styles.cta} data-cta-state={ctaState} href="/app/virtual-lab">
              Try it now
            </Link>
          </div>
        </div>
        {/* What the chosen one is, under its big cube: the one going fading as the next comes. */}
        <div
          className={styles.heroLabels}
          role="status"
          aria-live="polite"
          aria-label={FEATURES[scene].alt}
          data-shown={chosenShown}
        >
          {FEATURES.map((feature, index) => (
            <p
              key={feature.label}
              className={styles.heroLabel}
              data-active={index === scene}
              aria-hidden={index !== scene}
            >
              {'caption' in feature && feature.caption ? (
                <>
                  <strong>{feature.caption.kicker}</strong>
                  {feature.caption.text}
                </>
              ) : (
                feature.label
              )}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
