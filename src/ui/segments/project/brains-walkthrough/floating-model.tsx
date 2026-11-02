'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ViewOverlay } from '@/features/viewer-3d/bare';
import { ModelView } from '@/ui/segments/project/models/model-views';
import { cn } from '@/utils/css-class';

import { CNS_FRAME, FLY_FRAME, L6_COLOR, L6_FRAME } from './brains';
import styles from './floating-model.module.css';
import { NeuronSkeleton } from './neuron-skeleton';
import grid from './opening-grid.module.css';
import { FlyBody, FlyStageProvider } from './walking-fly';

import type { CSSProperties, ReactNode } from 'react';
import type { CircuitSpikes, ISpikeReplayBinding } from '@/features/circuit-viewer/types';
import type { FramedView, OwnPack } from '@/features/viewer-3d/bare';
import type { FrameBox } from '@/features/viewer-3d/engine/scene-view';
import type { TModel } from '@/ui/segments/project/models/models';

/**
 * Where a floating model is, by when: in its place but not shown while its view builds it, off the page
 * for a frame once it is built, in its place while on show, and out of the page again when not.
 */
type Moves = Record<'building' | 'off' | 'in' | 'out', CSSProperties>;

/**
 * What the walkthrough tells what floats over it, how to enter it, as a click on the intro would, and how to
 * tell it that what floats over the landing is built, for the intro to come with it.
 */
type FloatingState = {
  entered: boolean;
  revealed: boolean;
  chapter: number;
  enter: () => void;
  ready: () => void;
  goTo: (id: string) => void;
};

const BUILDING: CSSProperties = { transform: 'none', opacity: 0 };
const IN: CSSProperties = { transform: 'none', opacity: 1 };

/** The microcircuit, tilted across the top left corner and running off it: in from out of that corner. */
const L6_OFF = 'translate(calc(-4.21vw - 27.6vh - 20px), calc(-3.51vw - 23.2vh - 17px))';
const L6_MOVES: Moves = {
  building: BUILDING,
  // Out along the tilted column's side, its dendrites' tips just past the corner, to come in at once.
  off: { transform: L6_OFF, opacity: 1 },
  in: IN,
  // Up and away with the landing, as it scrolls on to the first screen.
  out: { transform: 'translateY(-100vh)', opacity: 1 },
};

/** A page below, with the first screen, which scrolls up into view as the landing goes. */
const FLY_BELOW: CSSProperties = { transform: 'translateY(100vh)', opacity: 1 };
const FLY_MOVES: Moves = {
  building: BUILDING,
  off: FLY_BELOW,
  in: IN,
  out: FLY_BELOW,
};

/**
 * The Male CNS over the landing too: in its bottom right corner, running a little off it, as the microcircuit
 * runs off the top left, clear of the landing's words, at 0.9 of its size on the first screen, about the same
 * middle (its view, a square 1.25 times the CNS, scales from its top left corner); drifting in from past that
 * corner once built.
 */
const CNS_LANDING_AT =
  'translate(calc(90vw - var(--cns-x) + var(--cns-h) * 0.0625), calc(34vh + var(--cns-h) * 0.0625)) scale(0.9)';
const CNS_ON_LANDING: CSSProperties = { transform: CNS_LANDING_AT, opacity: 1 };
const CNS_MOVES: Moves = {
  building: { transform: CNS_LANDING_AT, opacity: 0 },
  off: { transform: `${CNS_LANDING_AT} translate(22vw, 40vh)`, opacity: 1 },
  in: IN,
  out: CNS_ON_LANDING,
};

/** The fly over the landing: its view's middle low on the right, at the size it has on the first screen. */
const FLY_LANDING_AT = 'translate(calc(72vw - var(--cns-x)), calc(74vh - var(--cns-y)))';
const FLY_ON_LANDING: CSSProperties = { transform: FLY_LANDING_AT, opacity: 1 };
const FLY_CNS_MOVES: Moves = {
  building: { transform: FLY_LANDING_AT, opacity: 0 },
  // It comes from past the page's edge by walking.
  off: FLY_ON_LANDING,
  in: IN,
  out: FLY_ON_LANDING,
};
const FLY_FIRST_IN = 'opacity 0.3s ease-out';
/** The CNS's drift on the first screen; standing in the fly on the landing, it does not drift. */
const CNS_DRIFT: CSSProperties = { animationDuration: '13s', animationDelay: '-6s' };
const FLY_CNS_DRIFT: CSSProperties = { animationDuration: '13s' };
const STILL: CSSProperties = { animation: 'none' };

/** The mouse's neuron, from MICrONS: in from off the bottom right, past the most it reaches as it turns. */
const MOUSE_OFF = 'translate(calc(13vw + 26vh + 30px), 20vh)';
const MOUSE_MOVES: Moves = {
  building: BUILDING,
  off: { transform: MOUSE_OFF, opacity: 1 },
  in: IN,
  out: { transform: MOUSE_OFF, opacity: 0 },
};

/** Out of the page, or back in after it went out, as the page scrolls between the landing and the first screen. */
const GLIDE = 'transform 1000ms cubic-bezier(0.65, 0, 0.35, 1), opacity 0.6s ease-out';
/** The first way in, drifting from off the page and slowing as it comes to rest, after `ms`. */
const driftIn = (ms: number) => `transform 20s cubic-bezier(0.2, 0.55, 0.3, 1) ${ms}ms`;

const NOTHING_OVER = () => null;
/** How coarse a level of the pack may be, in device pixels: twice the viewer's own, in sooner, the same to see. */
const DETAIL_PIXELS = 4;
/** How far the pointer may go between going down and coming up, px, and still have clicked rather than turned. */
const CLICK_PX = 5;

/**
 * A model in a 3D view of its own floating over the walkthrough, on show over the landing or over the first
 * screen (`on`). Its view builds it where it will be, unseen, and tells it is built; the first time it is
 * to be shown, built and `at` ms after the page came up at the soonest, it is put off the page and drifts
 * in slowly from there, `delay` ms on. It glides out when its screen is left and back when it comes again,
 * and is gone on the screens after the first. A drag turns it, where its view turns by hand.
 */
function Floating({
  entered,
  chapter,
  enter,
  on,
  at = 0,
  delay = 0,
  moves,
  className,
  drift,
  tilt,
  behind = false,
  firstIn,
  view,
  revealed,
  ready,
  landing,
}: FloatingState & {
  /** Over the landing, over the first screen, or over both, gliding from the one place to the other. */
  on: 'landing' | 'first' | 'both';
  /** Where it rests over the landing, for one on show over both. */
  landing?: CSSProperties;
  at?: number;
  delay?: number;
  moves: Moves;
  /** Where it is while on show, and how large. */
  className: string;
  /** Its drift's own pace, so that two do not drift as one. */
  drift?: CSSProperties;
  /** Turned clockwise on the page, degrees, about its middle; its view still turns about the model's own axis. */
  tilt?: number;
  /**
   * Under the screen's stage once it is revealed, its videos over it, rather than over everything, the intro's
   * white included until then; the stage lets the pointer through to it.
   */
  behind?: boolean;
  /** How it comes the first time, where not drifting in from off the page. */
  firstIn?: string;
  /** Its view, told whether it has been sent in yet, and to tell once it is built. */
  view: (started: boolean, onBuilt: () => void) => ReactNode;
}) {
  const [built, setBuilt] = useState(false);
  const [waited, setWaited] = useState(false);
  const [sliding, setSliding] = useState(false);
  const down = useRef<{ x: number; y: number } | null>(null);
  const onBuilt = useCallback(() => setBuilt(true), []);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), at);
    return () => clearTimeout(timer);
  }, [at]);
  const shown = on === 'both' || (on === 'landing' ? !entered : entered);
  // Over the landing, built is when the intro starts, for the two to come in together.
  useEffect(() => {
    if (built && on === 'landing') ready();
  }, [built, on, ready]);
  const [started, setStarted] = useState(false);
  if (!started && built && waited && shown) setStarted(true);
  useEffect(() => {
    if (!started) return;
    // Drawn off the page for a frame, then sent in from there.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSliding(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [started]);
  // Back in after it went out, it glides, as the words do, rather than drifting in again.
  const [wentOut, setWentOut] = useState(false);
  if (sliding && !shown && !wentOut) setWentOut(true);
  // On show over both, it drifts in over the landing once, then glides between its two places.
  const [leftLanding, setLeftLanding] = useState(false);
  if (on === 'both' && entered && !leftLanding) setLeftLanding(true);
  // Past the screen after the first, let go of: its view costs a frame of its own each time it turns.
  if (chapter > 1) return null;
  const move = !started ? 'building' : !sliding ? 'off' : shown ? 'in' : 'out';
  const place = move === 'in' && on === 'both' && !entered && landing ? landing : moves[move];
  // Turned by hand while on show, over the landing only where on show over it alone; otherwise inert, so that
  // what is under it has the pointer.
  const live = chapter === 0 && move === 'in' && (on !== 'both' || entered);
  const transition =
    move === 'building' || move === 'off'
      ? 'none'
      : move === 'in' && !wentOut && !leftLanding
        ? (firstIn ?? driftIn(delay))
        : GLIDE;
  return (
    <div
      aria-hidden
      inert={!live || undefined}
      className={cn(
        'fixed origin-top-left mix-blend-multiply',
        // Before the stage in the page, so at the same level it is drawn under it.
        behind && revealed ? 'z-0' : 'z-[65]',
        live ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none',
        className
      )}
      style={{
        ...place,
        ...(chapter > 0 && { opacity: 0 }),
        transition: chapter > 0 ? 'opacity 0.6s ease-out' : transition,
      }}
      // A drag turns it; a click without one enters, as anywhere else on the landing.
      onPointerDown={(e) => {
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const from = down.current;
        if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) < CLICK_PX) enter();
      }}
    >
      <div className="size-full" style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}>
        <div className={styles.drift} style={drift}>
          {view(started, onBuilt)}
        </div>
      </div>
    </div>
  );
}

/**
 * The microcircuit's pack made lighter for this view, served by the app: the coarsest level alone, which is all
 * it draws at this size, and dendrites alone, as it hides axons; the morphologies of the outer ring of cells by
 * distance from the column's axis and of a fifth of the rest, the others somas, which looks no different from
 * outside. 20.3 MB against the stored pack's 170.8 MB (build_light_pack.py in the home_page group, from the
 * circuit's morphologies, with obi-one's pack writer).
 */
const L6_PACK: OwnPack = {
  id: 'l6-outer-dendrites',
  url: '/static/walkthrough/l6-outer-dendrites.mpack',
  size: 20263125,
  sha256: '23cf345c12ed95b401eb368eefbdf37bf543aa8ce6414533889676cbc6570807',
};
/** Made-up activity for the microcircuit: bursts of a cell and its 50 nearest neighbours, a second or so apart. */
const L6_ACTIVITY = '/static/walkthrough/l6-activity.json';

/** The microcircuit, pink, its local groups lighting up in turn, once the activity is in. */
function ActiveMicrocircuit({ started, onBuilt }: { started: boolean; onBuilt: () => void }) {
  const flashes = useActivity(L6_ACTIVITY);
  // As large as in a box of 93vh x 133vh at 1.15: the frame's box, 2617 x 3366 um across the view, fills the
  // square's height rather than that box's width.
  return (
    <FlashingCircuit
      started={started}
      onBuilt={onBuilt}
      model="l6"
      color={L6_COLOR}
      frame={L6_FRAME}
      frameZoom={0.95}
      pack={L6_PACK}
      flashes={flashes}
    />
  );
}
const L6_VIEW = (started: boolean, onBuilt: () => void) => (
  <ActiveMicrocircuit started={started} onBuilt={onBuilt} />
);

/** Activity the app serves, `{cells, times, ms}`, as spikes to replay, once it is in. */
function useActivity(url: string): CircuitSpikes | null {
  const [activity, setActivity] = useState<CircuitSpikes | null>(null);
  useEffect(() => {
    let gone = false;
    fetch(url)
      .then((response) => response.json())
      .then(
        (data: { cells: number[]; times: number[]; ms: number }) => {
          if (gone) return;
          setActivity({
            cellIndices: Uint32Array.from(data.cells),
            times: Float32Array.from(data.times),
            timeMinInMs: 0,
            timeMaxInMs: data.ms,
          });
        },
        () => {}
      );
    return () => {
      gone = true;
    };
  }, [url]);
  return activity;
}

/**
 * The whole FlyWire brain's surface, served by the app, from the whole-brain circuit built on this machine
 * (drosophila_brain, 137,712 neurons, not on the platform): every neuron cut to what lies within 20 µm of the
 * brain's surface, at one coarse level (2 µm), its neurites all drawn, numbered along a curve through space
 * into the 1,379 cells of the staging pilot the page shows, each a hundred or so neighbouring neurons that light
 * together (build_fly_surface_pack.py --order space, in the home_page group). 8.8 MB, 1.11M segments.
 */
const FLY_PACK: OwnPack = {
  id: 'fly-surface',
  url: '/static/walkthrough/fly-surface.mpack',
  size: 8797881,
  sha256: '64facca47840f75a9191b3a3642458b3874aff515c7e8eb8c94bfd75f55be15c',
};
/** The fly's brain in one blue, which its lit groups stand out of, as the viewer lights them in cyan. */
const FLY_BLUE = '#2558c9';
/** The cells of the pilot the page shows, which the pack's neurons are numbered into. */
const FLY_CELLS = 1379;
/** How long the made-up activity runs before it starts again, s. */
const FLASH_SECONDS = 60;

/**
 * Made-up activity for the fly's brain: every second or so, a cell and its neighbours along the pack's curve
 * through space, some hundreds of neighbouring neurons, firing within a few tens of ms of each other.
 */
function flashes(cells: number): CircuitSpikes {
  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const spikes: Array<[number, number]> = [];
  for (let t = 300; t < FLASH_SECONDS * 1000; t += 700 + random() * 900) {
    const centre = Math.floor(random() * cells);
    const reach = 2 + Math.floor(random() * 4);
    for (let cell = Math.max(0, centre - reach); cell <= Math.min(cells - 1, centre + reach); cell++) {
      spikes.push([cell, t + random() * 80]);
    }
  }
  spikes.sort((a, b) => a[1] - b[1]);
  return {
    cellIndices: Uint32Array.from(spikes, ([cell]) => cell),
    times: Float32Array.from(spikes, ([, t]) => t),
    timeMinInMs: 0,
    timeMaxInMs: FLASH_SECONDS * 1000,
  };
}
const FLY_FLASHES = flashes(FLY_CELLS);

/**
 * A circuit of the platform's in one colour, shaded as it turns, its cells lighting up as `flashes` has them,
 * round and round, once it is sent in: still until then, as it reads its finest only at rest.
 */
function FlashingCircuit({
  started,
  onBuilt,
  model,
  color,
  frame,
  frameZoom,
  pack,
  flashes,
  speed = 1000,
  afterglow = 0.9,
  bodies,
  over,
}: {
  started: boolean;
  onBuilt: () => void;
  model: TModel;
  color: string;
  frame: FrameBox;
  frameZoom: number;
  pack: OwnPack;
  flashes: CircuitSpikes | null;
  /** Simulated ms played a second. */
  speed?: number;
  /** Seconds for a lit cell to fade. */
  afterglow?: number;
  /**
   * Where each cell's Male CNS body id is, little-endian 32-bit, its cells a neuron each: a click on one picks
   * it, the rest going grey and faint, and its whole skeleton is drawn over them; a click beside it lets it go.
   */
  bodies?: string;
  /** Drawn over the view, in step with it, in place of the picked neuron's catcher. */
  over?: (view: FramedView) => ReactNode;
}) {
  const table = useBodies(bodies);
  const [picked, setPicked] = useState<number | null>(null);
  // The view, to draw the picked neuron over from out here, where the view's own fading does not reach.
  const [view, setView] = useState<FramedView | null>(null);
  const catchView = useCallback((seen: FramedView) => <ViewCatcher view={seen} onView={setView} />, []);
  const body = picked !== null && table ? table[picked] : null;
  // From the top again each time it runs out: a seek is read only when it changes, and so is playing, which
  // the end stops in the view and not here, so it is let go of for a frame to be started again.
  const [round, setRound] = useState(0);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    if (!ended) return;
    const frame = requestAnimationFrame(() => setEnded(false));
    return () => cancelAnimationFrame(frame);
  }, [ended]);
  const spikes = useMemo(
    (): ISpikeReplayBinding | undefined =>
      flashes
        ? {
            data: flashes,
            timeInMs: round % 2 ? 1e-3 : 0,
            playing: started && !ended,
            speed,
            afterglowInSeconds: afterglow,
            glow: true,
            onPlayingChange: (playing) => {
              // Its own stopping, while let go of, is not an end.
              if (playing || ended || !started) return;
              setRound((was) => was + 1);
              setEnded(true);
            },
          }
        : undefined,
    [flashes, round, started, ended, speed, afterglow]
  );
  return (
    <div className="relative size-full">
      <div
        className="size-full transition-opacity duration-500 ease-out"
        style={{ opacity: body === null ? 1 : PICKED_REST_OPACITY }}
      >
        <ViewOverlay
          frame={frame}
          render={over ?? (bodies ? catchView : NOTHING_OVER)}
          detailPixels={DETAIL_PIXELS}
          pack={pack}
          onBuilt={onBuilt}
        >
          <ModelView
            model={model}
            color={body === null ? color : PICKED_REST_COLOR}
            frameZoom={frameZoom}
            aoMoving
            spin={started}
            pickable={!!bodies}
            // Not singled out in the view, which would hide the rest: the skeleton over it is its highlight.
            highlightedCell={null}
            onCellPick={bodies ? setPicked : undefined}
            spikes={spikes}
          />
        </ViewOverlay>
      </div>
      {view && body !== null && <NeuronSkeleton view={view} body={body} color={color} />}
    </div>
  );
}

/** The rest of a circuit while one of its neurons is picked: light grey, and faint. */
const PICKED_REST_COLOR = '#9aa4b2';
const PICKED_REST_OPACITY = 0.45;

/** Hands the view it is drawn over to the host, for it to draw over the view from outside it. */
function ViewCatcher({ view, onView }: { view: FramedView; onView: (view: FramedView) => void }) {
  useEffect(() => onView(view), [view, onView]);
  return null;
}

/** The body ids of a circuit's cells, from `url`, once they are in. */
function useBodies(url: string | undefined): Uint32Array | null {
  const [bodies, setBodies] = useState<Uint32Array | null>(null);
  useEffect(() => {
    if (!url) return;
    let gone = false;
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then(
        (data) => {
          if (!gone) setBodies(new Uint32Array(data));
        },
        () => {}
      );
    return () => {
      gone = true;
    };
  }, [url]);
  return bodies;
}
const FLY_VIEW = (started: boolean, onBuilt: () => void) => (
  <FlashingCircuit
    started={started}
    onBuilt={onBuilt}
    model="fly"
    color={FLY_BLUE}
    frame={FLY_FRAME}
    // The frame's box, 839 x 411 um from in front, across the brain's width in its view, a quarter wider.
    frameZoom={0.8}
    pack={FLY_PACK}
    flashes={FLY_FLASHES}
  />
);
/**
 * The male fly's whole central nervous system, the Male CNS connectome's 164,606 point neurons, over the whole
 * page behind the words and recording of the screen `at`, faint, turning there. It is read unseen and still on
 * the screen before, to be drawn by the time its own comes, and let go of past the screen after; the viewer's
 * word that it is loading is not shown.
 */
export function CnsBackdrop({ chapter, at }: FloatingState & { at: number }) {
  if (chapter < at - 1 || chapter > at + 1) return null;
  const on = chapter === at;
  return (
    <div
      aria-hidden
      inert
      className={cn(
        'pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 ease-out [&_[data-testid=visualization-loading]]:hidden',
        on ? 'opacity-40' : 'opacity-0'
      )}
    >
      <ModelView model="cns" pickable={false} frameZoom={0.85} spin={on} />
    </div>
  );
}

/**
 * Whether a click on the Male CNS picks a neuron, drawn whole over the rest gone faint. That wants its pack a
 * neuron to a cell, hosted on the Male CNS LIF circuit itself, whose 55 MB of nodes the page then has to fetch
 * before the model can come; without it, the pack in neighbourhoods hosted on the small FlyWire pilot, in at once.
 */
const CNS_PICKING = false;

/**
 * The Male CNS's surface, served by the app, from Janelia's Male CNS v1.0 skeletons of the 164,606 neurons of the
 * Male CNS LIF circuit: each cut to what lies within 20 µm of the surface of the brain and nerve cord, at one
 * coarse level (2 µm), its neurites all drawn (fetch_malecns_swc.py, then build_malecns_surface_pack.py, in the
 * home_page group); 1.68M segments, from the 151,787 neurons that reach within 20 µm of the surface. Numbered
 * along a curve through space into the 1,379 cells of the staging FlyWire pilot the page hosts it on, each a
 * hundred or so neighbouring neurons (11.8 MB); or, for picking, a cell to each neuron in the circuit's own
 * order, for the circuit itself to host it (--per-neuron, 14.2 MB).
 */
const CNS_PACK: OwnPack = {
  id: 'male-cns-surface',
  url: '/static/walkthrough/male-cns-surface.mpack?v=db2ab7db',
  size: 11821250,
  sha256: 'db2ab7dba849c67a8a2787f1fc156e6b9188f46e99c36bd900e424da927ac97f',
};
const CNS_NEURON_PACK: OwnPack = {
  id: 'male-cns-neurons',
  url: '/static/walkthrough/male-cns-neurons.mpack?v=8ff90a0b',
  size: 14156003,
  sha256: '8ff90a0b07e791ed9a9ea5f9d7373c0588f865404b8034cd9eefee157b657598',
};
/**
 * The Male CNS LIF model's own activity: the paper's canonical run, the left sugar neurons driven at 150 Hz, its
 * first 320 ms, as the activity spreads out from them in two waves to where the brain's mushroom bodies and
 * antennal lobes start to ignite (make_malecns_activity.py, in the home_page group). In the pack's
 * neighbourhoods, a cell firing in a 20 ms bin where its neurons fire 10 spikes or more (--need 10); or, for
 * picking, each spike on its neuron, of 60% of the neurons that fire, for a gentler light (--per-neuron --keep 0.6).
 */
const CNS_ACTIVITY = '/static/walkthrough/male-cns-activity.json';
const CNS_NEURON_ACTIVITY = '/static/walkthrough/male-cns-neuron-activity.json';
/** The circuit's body ids, in its order, for a neuron picked to be drawn whole. */
const CNS_BODIES = '/static/walkthrough/male-cns-bodies.bin';

/**
 * The Male CNS, lit as its model's neurons fire, some sixteen times slower than they did, round and round;
 * with picking, a click on a neuron picks it, drawn whole over the rest gone faint.
 */
function ActiveMaleCns({
  started,
  onBuilt,
  over,
}: {
  started: boolean;
  onBuilt: () => void;
  over?: (view: FramedView) => ReactNode;
}) {
  const flashes = useActivity(CNS_PICKING ? CNS_NEURON_ACTIVITY : CNS_ACTIVITY);
  return (
    <FlashingCircuit
      started={started}
      onBuilt={onBuilt}
      model={CNS_PICKING ? 'cns' : 'fly'}
      color={FLY_BLUE}
      frame={CNS_FRAME}
      // The frame's box, 737 x 1015 um from below, up the CNS's height in its view, a quarter taller.
      frameZoom={0.8}
      pack={CNS_PICKING ? CNS_NEURON_PACK : CNS_PACK}
      flashes={flashes}
      speed={60}
      afterglow={0.25}
      bodies={CNS_PICKING ? CNS_BODIES : undefined}
      over={over}
    />
  );
}
const CNS_VIEW = (started: boolean, onBuilt: () => void) => (
  <ActiveMaleCns started={started} onBuilt={onBuilt} />
);

/** The Male CNS in NeuroMechFly's body over the landing, walking in and turning to face the page. */
function CnsInFly({ started, onBuilt, entered }: { started: boolean; onBuilt: () => void; entered: boolean }) {
  const walk = useRef<HTMLDivElement>(null);
  const stage = useMemo(() => ({ entered, started, walk }), [entered, started]);
  return (
    <FlyStageProvider stage={stage}>
      <div ref={walk} className="size-full">
        <ActiveMaleCns started={started} onBuilt={onBuilt} over={FLY_OVER} />
      </div>
    </FlyStageProvider>
  );
}
const FLY_OVER = (view: FramedView) => <FlyBody view={view} />;

const MOUSE_VIEW = (_started: boolean, onBuilt: () => void) => (
  <ModelView model="mouse" pickable={false} onReady={onBuilt} />
);

/**
 * The pink cortical microcircuit over the landing, turning in its own 3D view about its column, shaded as
 * it turns, and tilted 40 degrees across the top left corner: in from out of that corner once built,
 * taller than the screen, and back into it as the first screen is entered.
 */
export function FloatingMicrocircuit(state: FloatingState) {
  return (
    <Floating
      {...state}
      on="landing"
      moves={L6_MOVES}
      // A square sized by the height alone, so the column keeps its shape and, turned by hand, never meets
      // its view's edges; its middle near the top left corner, clear of the landing's words.
      className="top-[-62.5vh] left-[calc(8vw-72.5vh)] h-[145vh] w-[145vh]"
      tilt={40}
      view={L6_VIEW}
    />
  );
}

/**
 * The whole FlyWire brain's surface over the first screen, in blue, its neurons turning in their own 3D view
 * from in front and local groups of them lighting up in turn: built unseen over the landing, it comes up over
 * the right with the first screen as the landing scrolls away, and goes back down with it if the landing comes
 * back.
 */
export function FloatingFlyBrain(state: FloatingState) {
  return (
    <Floating
      {...state}
      on="first"
      behind
      // Up with the first screen as the landing scrolls away: it is built by then.
      firstIn={GLIDE}
      moves={FLY_MOVES}
      // Over the whole of the first screen's right, large.
      className={cn(grid.grid, grid.brain)}
      drift={{ animationDuration: '13s', animationDelay: '-6s' }}
      view={FLY_VIEW}
    />
  );
}

/**
 * The male fly's whole central nervous system over the landing and the first screen, its surface's neurons in
 * blue, lit as its model's neurons fire: over the landing inside NeuroMechFly's body, walking in along the bottom
 * right and turning to face the page (or, without the fly, in the bottom right corner, drifting in once built),
 * then over the first screen's right column, standing from the brain down the nerve cord and turning about it,
 * gliding there as the landing scrolls away and back as it comes again.
 */
export function FloatingMaleCns({
  walking,
  ...state
}: FloatingState & {
  /**
   * Over the landing inside NeuroMechFly's body, walking in along the bottom right and turning to face the page,
   * the body gone on the first screen; otherwise alone, drifting in and turning.
   */
  walking: boolean;
}) {
  const { entered } = state;
  const view = useCallback(
    (started: boolean, onBuilt: () => void) =>
      walking ? (
        <CnsInFly started={started} onBuilt={onBuilt} entered={entered} />
      ) : (
        CNS_VIEW(started, onBuilt)
      ),
    [walking, entered]
  );
  return (
    <Floating
      {...state}
      on="both"
      behind
      moves={walking ? FLY_CNS_MOVES : CNS_MOVES}
      landing={walking ? FLY_ON_LANDING : CNS_ON_LANDING}
      firstIn={walking ? FLY_FIRST_IN : undefined}
      // Over the right of the first screen, all but its height.
      className={cn(grid.grid, grid.cns)}
      drift={walking ? (entered ? FLY_CNS_DRIFT : STILL) : CNS_DRIFT}
      view={view}
    />
  );
}

/**
 * A mouse's pyramidal neuron over the first screen, MICrONS' mesh, turning, and by a drag too: built
 * unseen over the landing, it drifts in from off the bottom right as the first screen comes, running off
 * that corner, and goes back out if the landing comes again.
 */
export function FloatingMouseNeuron(state: FloatingState) {
  return (
    <Floating
      {...state}
      on="first"
      behind
      delay={800}
      moves={MOUSE_MOVES}
      // Upright, low in the corner by the first screen's words.
      className="top-[57vh] left-[calc(87vw-26vh)] h-[70vh] w-[52vh]"
      drift={{ animationDuration: '13s', animationDelay: '-6s' }}
      view={MOUSE_VIEW}
    />
  );
}
