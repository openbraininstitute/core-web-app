'use client';

/**
 * The m-type game's figure: one real cell at a time, turning, to be named from its shape — four
 * choices to a cell, or two, asking its family — ten cells to a game, then the score and what was
 * taken for what. Each slide plays a game of its own: excitatory or inhibitory; the excitatory
 * kinds; the interneurons; and all 26.
 */

import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useCanvasFrame } from '@/features/learn/components/basics/useCanvasFrame';
import { Embedded } from '@/features/learn/components/embedded';
import { type RGB, rgba } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

import { type Look, lookOf, words } from '../ui/canvas';
import { aName, FAMILY_TELLS, type Family, KINDS, nameOf } from './kinds';

export const MTYPE_STEPS = ['family', 'excitatory', 'interneurons', 'all'] as const;
export type MtypeStep = (typeof MTYPE_STEPS)[number];

/** Cells to a game. */
const ROUNDS = 10;
/** How fast a cell turns by itself, rad/s; and as it is dragged, rad/px. */
const SPIN = 0.3;
const TURN_PER_PX = 0.01;
/** The most a cell is drawn at, px to the µm. */
const MAX_SCALE = 0.45;

/**
 * One kind's cell: its kind, by the cortex course's code, and EntityCore's label for it; its nodes,
 * µm, the soma first and at 0, y towards the pia, and each one's type (2 the axon) and parent.
 */
interface Cell {
  type: string;
  label: string;
  x: Int16Array;
  y: Int16Array;
  z: Int16Array;
  t: Uint8Array;
  p: Int32Array;
  /** The line up through the middle of the box round it, how far it reaches round that, and its bottom and top. */
  mx: number;
  mz: number;
  round: number;
  low: number;
  high: number;
  /** Where its nodes were last drawn, px. */
  sx: Float32Array;
  sy: Float32Array;
}

let cells: Promise<Cell[]> | null = null;
/** The 26, fetched once; asked for again if that failed. */
function loadCells() {
  cells ??= fetch('/static/learn/heuristics/mtypes.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`mtypes: ${r.status}`))))
    .then(
      (d: {
        cells: {
          type: string;
          mtype: string;
          x: number[];
          y: number[];
          z: number[];
          t: number[];
          p: number[];
        }[];
      }) =>
        d.cells
          .filter((c) => KINDS[c.type])
          .map((c): Cell => {
            const [mx, mz] = [c.x, c.z].map((v) => (Math.min(...v) + Math.max(...v)) / 2);
            let round = 1;
            for (let j = 0; j < c.x.length; j++)
              round = Math.max(round, Math.hypot(c.x[j] - mx, c.z[j] - mz));
            return {
              type: c.type,
              label: c.mtype,
              x: Int16Array.from(c.x),
              y: Int16Array.from(c.y),
              z: Int16Array.from(c.z),
              t: Uint8Array.from(c.t),
              p: Int32Array.from(c.p),
              mx,
              mz,
              round,
              low: Math.min(...c.y),
              high: Math.max(...c.y),
              sx: new Float32Array(c.x.length),
              sy: new Float32Array(c.x.length),
            };
          })
    )
    .catch((e) => {
      cells = null;
      throw e;
    });
  return cells;
}

/** A round: its cell; its choices, kinds by their codes, or the two families; and how the cell is shown, turned and mirrored or not. */
interface Round {
  cell: Cell;
  choices: string[];
  turn: number;
  mirror: boolean;
}
/** A game: its rounds; the one on show, `rounds.length` once the score is up; and what was picked in each so far. */
interface Game {
  rounds: Round[];
  at: number;
  picks: string[];
}

const answerOf = (step: MtypeStep, cell: Cell) =>
  step === 'family' ? KINDS[cell.type].family : cell.type;

function shuffled<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A cell's choices: its kind, and three more of the step's — mostly ones that look like it, then
 * its own family's — in a random order; or, asking its family, the two families.
 */
function choicesFor(step: MtypeStep, cell: Cell, pool: Cell[]) {
  if (step === 'family') return ['excitatory', 'inhibitory'];
  const own = KINDS[cell.type];
  const others = pool
    .filter((c) => c !== cell)
    .map((c) => {
      const k = KINDS[c.type];
      const rank =
        Math.random() + (k.look === own.look ? 0.8 : 0) + (k.family === own.family ? 0.5 : 0);
      return { type: c.type, rank };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 3)
    .map((o) => o.type);
  return shuffled([cell.type, ...others]);
}

function newGame(step: MtypeStep, all: Cell[]): Game {
  const family: Family | null =
    step === 'excitatory' ? 'excitatory' : step === 'interneurons' ? 'inhibitory' : null;
  const pool = family ? all.filter((c) => KINDS[c.type].family === family) : all;
  const rounds = shuffled(pool)
    .slice(0, ROUNDS)
    .map((cell) => ({
      cell,
      choices: choicesFor(step, cell, pool),
      turn: Math.random() * Math.PI * 2,
      mirror: Math.random() < 0.5,
    }));
  return { rounds, at: 0, picks: [] };
}

const isFamily = (choice: string): choice is Family =>
  choice === 'excitatory' || choice === 'inhibitory';

/** The axon's colour, in each look; the dendrites and soma are drawn in the ink. */
const axonOf = (L: Look): RGB => (L.dark ? [56, 189, 248] : [9, 109, 217]);

/**
 * A cell filling the box short of the words round its edges — or, a small one, no bigger than
 * `MAX_SCALE` draws it, since its few points show as sticks drawn larger — turned `angle` about the
 * line up through it: its axon first, in blue and finer, then its dendrites over it, and its soma.
 * Gives its scale, px to the µm.
 */
function drawCell(
  ctx: CanvasRenderingContext2D,
  c: Cell,
  w: number,
  h: number,
  angle: number,
  mirror: boolean,
  L: Look
) {
  const [side, head, foot] = [22, 30, 36];
  const s = Math.min(
    MAX_SCALE,
    (w - 2 * side) / (2 * c.round),
    (h - head - foot) / Math.max(1, c.high - c.low)
  );
  const top = head + (h - head - foot - (c.high - c.low) * s) / 2;
  const [cos, sin, m] = [Math.cos(angle), Math.sin(angle), mirror ? -1 : 1];
  const n = c.x.length;
  for (let j = 0; j < n; j++) {
    c.sx[j] = w / 2 + (m * (c.x[j] - c.mx) * cos + (c.z[j] - c.mz) * sin) * s;
    c.sy[j] = top + (c.high - c.y[j]) * s;
  }
  const width = Math.max(0.8, Math.min(2.2, 0.5 + s * 2.4));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const axon of [true, false]) {
    ctx.strokeStyle = axon ? rgba(axonOf(L), 0.85) : rgba(L.ink, 1);
    ctx.lineWidth = axon ? width * 0.6 : width;
    ctx.beginPath();
    for (let j = 1; j < n; j++) {
      const q = c.p[j];
      if (q < 0 || (c.t[j] === 2) !== axon) continue;
      ctx.moveTo(c.sx[q], c.sy[q]);
      ctx.lineTo(c.sx[j], c.sy[j]);
    }
    ctx.stroke();
  }
  ctx.fillStyle = rgba(L.ink, 1);
  ctx.beginPath();
  ctx.arc(c.sx[0], c.sy[0], Math.max(2.2, Math.min(6, s * 9)), 0, Math.PI * 2);
  ctx.fill();
  return s;
}

/** Which way is up, what is drawn in which colour, and a scale bar of a round length near 120px. */
function drawKey(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, L: Look) {
  words(ctx, "↑ the brain's surface", 14, 14, L.ink, 0.6, 11);
  const y = h - 13;
  ctx.lineCap = 'round';
  const parts: [string, RGB, number][] = [
    ['dendrites', L.ink, 2],
    ['axon', axonOf(L), 1.3],
  ];
  for (const [k, [name, colour, width]] of parts.entries()) {
    const x = 14 + k * 96;
    ctx.strokeStyle = rgba(colour, 1);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 18, y);
    ctx.stroke();
    words(ctx, name, x + 25, y, L.ink, 0.7, 11);
  }
  const um = [10, 20, 50, 100, 200, 500, 1000].reduce((best, v) => (v * s <= 130 ? v : best), 10);
  ctx.strokeStyle = rgba(L.ink, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w - 14 - um * s, y);
  ctx.lineTo(w - 14, y);
  ctx.stroke();
  words(ctx, `${um} µm`, w - 20 - um * s, y, L.ink, 0.7, 11, 'right');
}

export default function MtypesFigure({ step }: { step: MtypeStep; back?: boolean }) {
  // a new game on each slide
  return <Play key={step} step={step} />;
}

function Play({ step }: { step: MtypeStep }) {
  // outside a course, as on the Learn page's card: as tall as the card asks, and no keys
  const embedded = useContext(Embedded);
  const [all, setAll] = useState<Cell[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const hand = useRef<{
    shown: Round | null;
    angle: number;
    last: number;
    drag: { id: number; x: number; angle: number } | null;
  }>({ shown: null, angle: 0, last: 0, drag: null });
  const nextButton = useRef<HTMLButtonElement | null>(null);
  // a small picture of it, hidden from screen readers, as in a row of the Learn page's list: not
  // played there, so its choices are words, with no buttons to reach inside the row's own
  const root = useRef<HTMLDivElement | null>(null);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(!!root.current?.closest('[aria-hidden="true"]'));
  }, []);

  useEffect(() => {
    let live = true;
    loadCells().then(
      (c) => {
        if (!live) return;
        setAll(c);
        setGame(newGame(step, c));
      },
      () => live && setFailed(true)
    );
    return () => {
      live = false;
    };
  }, [step]);
  const retry = () => {
    setFailed(false);
    loadCells().then(
      (c) => {
        setAll(c);
        setGame(newGame(step, c));
      },
      () => setFailed(true)
    );
  };

  const over = !!game && game.at >= game.rounds.length;
  // the cell on show: the last one still, once the score is up
  const round = game ? game.rounds[Math.min(game.at, game.rounds.length - 1)] : null;
  const picked = game && !over ? game.picks[game.at] : undefined;
  const answer = round ? answerOf(step, round.cell) : '';
  const score = game
    ? game.picks.filter((p, i) => p === answerOf(step, game.rounds[i].cell)).length
    : 0;

  // once to a round, and not once the score is up
  const pick = useCallback(
    (choice: string) =>
      setGame((g) =>
        g && g.at < g.rounds.length && g.picks.length === g.at
          ? { ...g, picks: [...g.picks, choice] }
          : g
      ),
    []
  );
  // on from a round once it is answered
  const advance = useCallback(
    () =>
      setGame((g) =>
        g && g.at < g.rounds.length && g.picks.length > g.at ? { ...g, at: g.at + 1 } : g
      ),
    []
  );
  const again = () => all && setGame(newGame(step, all));

  // a guess made, Next has the focus, for whoever goes on from the keyboard
  useEffect(() => {
    if (picked !== undefined) nextButton.current?.focus({ preventScroll: true });
  }, [picked]);

  // in a course, 1 to 4 choose, and then Enter or space goes on: wherever the focus is, as a click
  // leaves it on the page when the choice it was on is disabled, but a button's own
  useEffect(() => {
    if (embedded || !round || over) return;
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target instanceof Element ? ev.target : null;
      if (el?.closest('input, textarea, select') || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (picked === undefined) {
        const k = Number(ev.key) - 1;
        if (Number.isInteger(k) && k >= 0 && k < round.choices.length) {
          ev.preventDefault();
          pick(round.choices[k]);
        }
      } else if ((ev.key === 'Enter' || ev.key === ' ') && !el?.closest('button, a')) {
        ev.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [embedded, round, picked, over, pick, advance]);

  const canvasRef = useCanvasFrame((ctx, w, h, now) => {
    if (!round) return;
    const H = hand.current;
    if (H.shown !== round) Object.assign(H, { shown: round, angle: round.turn, last: now });
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!H.drag && !still) H.angle += ((now - H.last) / 1000) * SPIN;
    H.last = now;
    const L = lookOf();
    const s = drawCell(ctx, round.cell, w, h, H.angle, round.mirror, L);
    drawKey(ctx, w, h, s, L);
  });

  const onGrab = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // a pointer no longer down: the drag still works within the figure
    }
    hand.current.drag = { id: e.pointerId, x: e.clientX, angle: hand.current.angle };
  };
  const onDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = hand.current.drag;
    if (d && d.id === e.pointerId) hand.current.angle = d.angle + (e.clientX - d.x) * TURN_PER_PX;
  };
  const onDrop = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (hand.current.drag?.id === e.pointerId) hand.current.drag = null;
  };

  const kind = round ? KINDS[round.cell.type] : null;
  const misses = game
    ? game.rounds.filter(
        (r, i) => i < game.picks.length && game.picks[i] !== answerOf(step, r.cell)
      )
    : [];
  // a kind's label, under its name on its button
  const labelOf = (type: string) => all?.find((c) => c.type === type)?.label;

  let panel: React.ReactNode;
  if (failed)
    panel = (
      <div className="flex flex-col items-start gap-3 text-[14px] text-slate-300">
        The cells could not be loaded.
        <button type="button" onClick={retry} className={NEXT}>
          Try again
        </button>
      </div>
    );
  else if (!game || !round || !kind)
    panel = <p className="text-[14px] text-slate-500">Fetching the cells…</p>;
  else if (over)
    panel = (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[20px] font-semibold text-slate-100">
          You got {score} of {game.rounds.length} right.
        </p>
        {misses.length > 0 && (
          <ul className="flex flex-col gap-1 text-[13px] leading-snug text-slate-400">
            {misses.map((r) => {
              const said = game.picks[game.rounds.indexOf(r)];
              return (
                <li key={r.cell.type}>
                  {step === 'family'
                    ? `${nameOf(r.cell.type)}: ${KINDS[r.cell.type].family}, not ${said}`
                    : `${nameOf(r.cell.type)}, not ${aName(said)}`}
                </li>
              );
            })}
          </ul>
        )}
        <button type="button" onClick={again} className={NEXT}>
          Play again
        </button>
      </div>
    );
  else
    panel = (
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between font-mono text-[11px] tracking-widest text-slate-500 uppercase">
          <span>
            Cell {game.at + 1} of {game.rounds.length}
          </span>
          <span>{score} right</span>
        </div>
        <div className="flex flex-col gap-2">
          {round.choices.map((choice, k) => {
            const inner = (
              <>
                {!embedded && <span className="font-mono text-[11px] text-slate-500">{k + 1}</span>}
                <span className="flex flex-col">
                  <span className="text-[14px] leading-snug text-slate-100">
                    {isFamily(choice)
                      ? choice.charAt(0).toUpperCase() + choice.slice(1)
                      : nameOf(choice)}
                  </span>
                  {!isFamily(choice) && (
                    <span className="font-mono text-[11px] text-slate-500">{labelOf(choice)}</span>
                  )}
                </span>
              </>
            );
            const box = cn(
              'flex w-full items-baseline gap-3 rounded-lg border px-3.5 py-2 text-left transition-colors',
              picked === undefined &&
                'border-slate-800 bg-slate-900/40 hover:border-sky-500 hover:bg-sky-500/10',
              picked !== undefined &&
                (choice === answer
                  ? 'border-emerald-500 bg-emerald-500/15'
                  : choice === picked
                    ? 'border-rose-500 bg-rose-500/15'
                    : 'border-slate-800 opacity-45')
            );
            return still ? (
              <span key={choice} className={box}>
                {inner}
              </span>
            ) : (
              <button
                type="button"
                key={choice}
                onClick={() => pick(choice)}
                disabled={picked !== undefined}
                className={box}
              >
                {inner}
              </button>
            );
          })}
        </div>
        {picked !== undefined && (
          <div className="flex flex-col items-start gap-3">
            <p role="status" className="text-[14px] leading-snug text-slate-200">
              <span className={picked === answer ? 'text-emerald-200' : 'text-rose-200'}>
                {picked === answer ? 'Right: ' : 'It is '}
              </span>
              {step === 'family'
                ? `${kind.family} — ${aName(round.cell.type)}.`
                : `${aName(round.cell.type)}.`}{' '}
              <span className="text-slate-400">
                {step === 'family' ? FAMILY_TELLS[kind.family] : kind.tell}
              </span>
            </p>
            <button type="button" ref={nextButton} onClick={advance} className={NEXT}>
              {game.at + 1 < game.rounds.length ? 'Next cell →' : 'See your score →'}
            </button>
          </div>
        )}
      </div>
    );

  return (
    // the choices top-aligned with the cell, so that the words a guess adds below them move nothing
    <div ref={root} className="@container flex w-full flex-1 flex-col pt-2">
      <div className="grid w-full items-start gap-6 @2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="One real neuron from the rat's somatosensory cortex, turning, its dendrites in the ink and its axon in blue: which kind it is, to be picked from the choices beside it."
          title="Drag to turn the cell"
          className={cn(
            'w-full cursor-grab touch-none select-none active:cursor-grabbing',
            embedded ? 'h-(--learn-figure-h,340px)' : 'h-[420px]'
          )}
          onPointerDown={onGrab}
          onPointerMove={onDrag}
          onPointerUp={onDrop}
          onPointerCancel={onDrop}
          // a drag across it turns the cell, rather than swiping on to another slide
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        />
        {panel}
      </div>
    </div>
  );
}

const NEXT =
  'rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-sky-400';
