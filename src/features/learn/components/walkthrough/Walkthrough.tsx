'use client';

/**
 * Minimalist left-to-right walkthrough: one idea per slide, arrow keys or the
 * edge buttons to move. Only the current slide is mounted, so at most one
 * widget animation loop runs at a time. Copied from the learn app, where each
 * course is a page of slides played through it.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import ChargeWidget from '@/features/learn/components/basics/ChargeWidget';
import ExcitationWidget from '@/features/learn/components/basics/ExcitationWidget';
import MorphologyFigure from '@/features/learn/components/basics/MorphologyFigure';
import NernstWidget from '@/features/learn/components/basics/NernstWidget';
import RcWidget from '@/features/learn/components/basics/RcWidget';
import RestingWidget from '@/features/learn/components/basics/RestingWidget';
import Cortex, { type CortexStep, isCortexStep } from '@/features/learn/components/cortex/Cortex';
import CourseFigure from '@/features/learn/components/courses/CourseFigure';
import { type CourseWidget, isCourseWidget } from '@/features/learn/components/courses/registry';
import Heuristics from '@/features/learn/components/heuristics/Heuristics';
import { isStage, type Stage } from '@/features/learn/components/heuristics/shared';
import { savedTypewriter, subscribe } from '@/features/learn/lib/settings';

export interface Slide {
  /** Large line — the spoken sentence. */
  say: string;
  /** Optional second line, set like the first. */
  note?: string;
  /** A figure: one of the stages the heuristic figure runs across, or a course's figure. */
  widget?:
    | Stage
    | CortexStep
    | CourseWidget
    | 'charge'
    | 'nernst'
    | 'resting'
    | 'rc'
    | 'morphology'
    | 'excitation'
    | 'ais';
  cta?: { href: string; label: string };
}

export default function Walkthrough({
  slides,
  typewriter = false,
  startAt = 0,
  home,
  onSlide,
}: {
  /** The slides to step through. */
  slides: Slide[];
  /**
   * Whether these slides may type out, with that setting on: wholly, line then
   * note; or `"titles"`, each slide's line, its note fading in once the line is there.
   */
  typewriter?: boolean | 'titles';
  /** The slide to open on, as left last time. It is shown whole, as a slide you come back to. */
  startAt?: number;
  /** Where ← goes from the first slide, and the header's link: the Learn page the course was opened from. */
  home: string;
  /** Told each slide as it is shown, to keep the learner's place. */
  onSlide?: (index: number) => void;
}) {
  const first = Math.min(Math.max(0, startAt), slides.length - 1);
  const [i, setI] = useState(first);
  const [dir, setDir] = useState(first > 0 ? -1 : 1);
  const router = useRouter();
  // The typewriter setting; null until hydrated, since the server can't know it.
  const typewriterOn = useSyncExternalStore<boolean | null>(subscribe, savedTypewriter, () => null);
  // While the current slide is still typing out, this shows the rest of it.
  const finishTyping = useRef<(() => void) | null>(null);
  const setFinisher = useCallback((finish: (() => void) | null) => {
    finishTyping.current = finish;
  }, []);

  const go = useCallback(
    (delta: number) => {
      // Forward on a slide that is still typing finishes it, rather than leaving it.
      if (delta > 0 && finishTyping.current) {
        finishTyping.current();
        return;
      }
      if (delta < 0 && i === 0) {
        router.push(home);
        return;
      }
      const next = Math.min(slides.length - 1, Math.max(0, i + delta));
      if (next === i) return;
      setDir(delta > 0 ? 1 : -1);
      setI(next);
    },
    [i, home, router, slides.length]
  );

  useEffect(() => {
    onSlide?.(i);
  }, [i, onSlide]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (ev.key === 'ArrowRight' || ev.key === 'PageDown') {
        ev.preventDefault();
        go(1);
      } else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') {
        ev.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // horizontal swipe
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const s = slides[i];
  const wide = Boolean(s.widget);
  // Typed out on the way forward only: a slide you go back to is as you left it.
  const typing = !!typewriter && typewriterOn === true && dir > 0;

  return (
    <div
      className="flex min-h-[calc(100dvh-var(--chrome-h))] flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* pr-16 keeps the slide count clear of the settings button. */}
      <header className="flex items-center justify-between py-4 pr-16 pl-5 text-[11px] tracking-widest text-slate-600 uppercase">
        <Link href={home} className="font-mono hover:text-slate-400">
          ← learn
        </Link>
        <span className="font-mono">
          {String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </span>
      </header>

      {/* A slide with a figure has its words up near the header, and the figure in the middle of the room below. */}
      <main
        className={`relative flex flex-1 justify-center px-6 ${wide ? 'items-stretch pt-[3vh] pb-4' : 'items-center py-4'}`}
      >
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="absolute left-1 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-slate-700 transition-colors hover:text-slate-300 disabled:opacity-0"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={i === slides.length - 1}
          aria-label="Next"
          className="absolute right-1 top-1/2 -translate-y-1/2 px-3 py-6 text-2xl text-slate-700 transition-colors hover:text-slate-300 disabled:opacity-0"
        >
          ›
        </button>

        <div className={`flex w-full flex-col ${wide ? 'max-w-5xl gap-5' : 'max-w-4xl gap-4'}`}>
          <div
            key={i}
            className={`flex flex-col ${wide ? 'gap-5' : 'gap-4'} ${
              dir > 0 ? 'animate-slide-in-right' : 'animate-slide-in-left'
            }`}
          >
            <SlideText
              key={typing ? 'typing' : 'still'}
              slide={s}
              wide={wide}
              typing={typing}
              typeNote={typewriter === true}
              pending={!!typewriter && typewriterOn === null}
              onFinisher={setFinisher}
            />

            {s.widget === 'charge' && <ChargeWidget />}
            {s.widget === 'nernst' && <NernstWidget />}
            {s.widget === 'resting' && <RestingWidget />}
            {s.widget === 'rc' && <RcWidget />}
            {s.widget === 'morphology' && <MorphologyFigure mode="gallery" />}
            {s.widget === 'excitation' && <ExcitationWidget />}
            {s.widget === 'ais' && <MorphologyFigure mode="ais" />}

            {s.cta && (
              <Link
                href={s.cta.href}
                className={`w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 ${
                  wide ? '' : 'self-end'
                }`}
              >
                {s.cta.label} →
              </Link>
            )}
          </div>

          {/* One figure across several slides, outside the slide that changes: it stays put while the words
              move, and goes on from where the last slide left it — or, come back to, eases back. */}
          {isStage(s.widget) && <Heuristics stage={s.widget} back={dir < 0} />}
          {isCortexStep(s.widget) && <Cortex step={s.widget} back={dir < 0} />}
          {isCourseWidget(s.widget) && <CourseFigure widget={s.widget} back={dir < 0} />}
        </div>
      </main>

      <footer className="flex items-center justify-between gap-4 px-5 pb-5">
        <div className="flex flex-1 gap-1.5" role="tablist" aria-label="Slides">
          {slides.map((_, k) => (
            <button
              type="button"
              key={k}
              onClick={() => {
                setDir(k > i ? 1 : -1);
                setI(k);
              }}
              role="tab"
              aria-selected={k === i}
              aria-label={`Slide ${k + 1}`}
              className={`h-0.5 flex-1 rounded-full transition-colors ${
                k <= i ? 'bg-sky-400/80' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] text-slate-600">← →</span>
      </footer>
    </div>
  );
}

/** Milliseconds per character, punctuation included: it types straight through. */
const TYPE_MS = 35;

/**
 * A slide's large line and note. With `typing`, they appear a character at a
 * time, the note after the line — or, without `typeNote`, only the line types,
 * and the note fades in once it is there; `onFinisher` is handed a way to skip
 * to the end for as long as there is any typing left. Keyed by its caller, so
 * turning the typewriter on or off starts it afresh.
 */
function SlideText({
  slide,
  wide,
  typing,
  typeNote,
  pending,
  onFinisher,
}: {
  slide: Slide;
  wide: boolean;
  typing: boolean;
  typeNote: boolean;
  /** Before hydration, with the setting not yet known: hidden by CSS if it turns out to be on. */
  pending: boolean;
  onFinisher: (finish: (() => void) | null) => void;
}) {
  const chars = useMemo(
    () => Array.from(slide.say + (typeNote ? (slide.note ?? '') : '')),
    [slide, typeNote]
  );
  const sayLength = useMemo(() => Array.from(slide.say).length, [slide]);
  const total = chars.length;
  const [count, setCount] = useState(typing ? 0 : total);
  const done = count >= total;
  // Kept to the clock, not to the timer: on a slide whose figure keeps the page busy the timer fires late, and
  // the typing catches up rather than slowing down.
  const began = useRef<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: each new count re-arms the timer for the next character
  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => {
      began.current ??= performance.now() - TYPE_MS;
      const due = Math.floor((performance.now() - began.current) / TYPE_MS);
      setCount((c) => Math.min(total, Math.max(c + 1, due)));
    }, TYPE_MS);
    return () => clearTimeout(timer);
  }, [count, done, total]);

  useEffect(() => {
    if (done) return;
    onFinisher(() => setCount(total));
    return () => onFinisher(null);
  }, [done, total, onFinisher]);

  const sayShown = Math.min(count, sayLength);
  // The line and the note are set alike — typeface, size and colour — and told
  // apart only by where they sit.
  const textStyle = `font-semibold tracking-tight text-slate-100 ${
    wide ? 'text-xl sm:text-2xl' : 'text-3xl leading-tight sm:text-4xl'
  }`;
  // Unless the "quieter notes" setting is on: then the note steps back, a size
  // below the line and in grey.
  const quiet = wide
    ? 'quiet-notes:text-sm quiet-notes:text-slate-400 quiet-notes:sm:text-sm'
    : 'quiet-notes:text-xl quiet-notes:leading-snug quiet-notes:text-slate-400 quiet-notes:sm:max-w-xl quiet-notes:sm:text-2xl';

  return (
    <>
      <h1
        data-typewriter-pending={pending || undefined}
        className={`text-balance ${textStyle} ${wide ? '' : 'max-w-2xl'}`}
      >
        {typing ? (
          <Typed text={slide.say} shown={sayShown} caret={!done && count <= sayLength} />
        ) : (
          slide.say
        )}
      </h1>
      {slide.note && (
        // On a text slide the note answers from below and to the right, the
        // line having the upper left; above a widget it stays put.
        <p
          data-typewriter-pending={pending || undefined}
          className={`text-pretty ${textStyle} ${
            wide ? 'max-w-3xl' : 'mt-6 max-w-[85%] self-end sm:mt-10 sm:max-w-2xl'
          } ${quiet} ${typing && !typeNote ? `transition-opacity duration-500 ${done ? 'opacity-100' : 'opacity-0'}` : ''}`}
        >
          {typing && typeNote ? (
            <Typed text={slide.note} shown={count - sayShown} caret={!done && count > sayLength} />
          ) : (
            slide.note
          )}
        </p>
      )}
    </>
  );
}

/**
 * `text` with only its first `shown` characters visible. The rest is laid out
 * invisibly, so the lines already break where they will end up and nothing
 * reflows as it types; a screen reader gets all of it at once.
 */
function Typed({ text, shown, caret }: { text: string; shown: number; caret: boolean }) {
  const chars = Array.from(text);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {chars.slice(0, shown).join('')}
        {caret && <span className="typing-caret" />}
        <span className="invisible">{chars.slice(shown).join('')}</span>
      </span>
    </>
  );
}
