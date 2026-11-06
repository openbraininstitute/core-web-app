'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import {
  applySaved,
  savedQuietNotes,
  savedSomaZoom,
  savedSpill,
  savedTheme,
  savedTypewriter,
  setQuietNotes,
  setSomaZoom,
  setSpill,
  setTheme,
  setTypewriter,
} from '@/features/learn/lib/settings';
import { getTheme, type Theme } from '@/features/learn/lib/theme';

const THEMES: { id: Theme; label: string; hint: string; page: string; ink: string }[] = [
  { id: 'dark', label: 'Dark', hint: 'The original', page: '#060911', ink: '#38bdf8' },
  {
    id: 'obi',
    label: 'OBI',
    hint: 'White and blue, with the logo',
    page: '#ffffff',
    ink: '#002766',
  },
];

/**
 * Settings, from a button at the top right of a course: the theme, whether its
 * slides type themselves out, how its notes are set, whether its 3D figure is
 * drawn whole, over the page, and whether it closes in on the soma on the
 * soma's slide.
 *
 * Positioned against the page rather than the viewport, so it scrolls away
 * instead of sitting over the widgets' own controls.
 */
export default function Settings() {
  const [open, setOpen] = useState(false);
  const [theme, setThemeChoice] = useState<Theme>(getTheme);
  const [typewriter, setTypewriterChoice] = useState(false);
  const [quietNotes, setQuietNotesChoice] = useState(false);
  const [spill, setSpillChoice] = useState(false);
  const [somaZoom, setSomaZoomChoice] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // The page's inline script applies the saved settings before first paint, on a
  // page load; a client-side navigation runs no script, so apply them here too.
  useLayoutEffect(() => {
    applySaved();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (ev: PointerEvent) => {
      if (!root.current?.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    setThemeChoice(t);
  };

  const toggleTypewriter = () => {
    setTypewriter(!typewriter);
    setTypewriterChoice(!typewriter);
  };

  const toggleQuietNotes = () => {
    setQuietNotes(!quietNotes);
    setQuietNotesChoice(!quietNotes);
  };

  const toggleSpill = () => {
    setSpill(!spill);
    setSpillChoice(!spill);
  };

  const toggleSomaZoom = () => {
    setSomaZoom(!somaZoom);
    setSomaZoomChoice(!somaZoom);
  };

  return (
    <div ref={root} className="absolute top-3.5 right-3 z-50 sm:right-4">
      <button
        type="button"
        onClick={() => {
          setThemeChoice(savedTheme());
          setTypewriterChoice(savedTypewriter());
          setQuietNotesChoice(savedQuietNotes());
          setSpillChoice(savedSpill());
          setSomaZoomChoice(savedSomaZoom());
          setOpen((o) => !o);
        }}
        aria-label="Settings"
        aria-expanded={open}
        title="Settings"
        className="grid h-9 w-9 place-items-center rounded-full border border-slate-800 bg-slate-950/60 text-slate-500 backdrop-blur transition-colors hover:border-slate-700 hover:text-slate-300"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <circle cx="15" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-xl shadow-black/20"
        >
          <p className="mb-2 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
            Theme
          </p>
          <div role="radiogroup" aria-label="Theme" className="flex flex-col gap-1.5">
            {THEMES.map((t) => (
              // biome-ignore lint/a11y/useSemanticElements: a radio drawn as a card, with its swatch and hint
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={theme === t.id}
                onClick={() => chooseTheme(t.id)}
                className={`flex items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  theme === t.id
                    ? 'border-sky-500/60 bg-sky-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <span
                  className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-slate-700"
                  style={{ background: t.page }}
                  aria-hidden="true"
                >
                  <span
                    className="absolute inset-x-1.5 bottom-1.5 h-1.5 rounded-full"
                    style={{ background: t.ink }}
                  />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">{t.label}</span>
                  <span className="text-xs text-slate-500">{t.hint}</span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-4 mb-2 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
            Walkthrough
          </p>
          <div className="flex flex-col gap-1.5">
            <Switch
              label="Type out the slides"
              hint="Each slide's words, a character at a time"
              on={typewriter}
              onToggle={toggleTypewriter}
            />
            <Switch
              label="Quieter notes"
              hint="A size below the line, in grey"
              on={quietNotes}
              onToggle={toggleQuietNotes}
            />
            <Switch
              label="Show the whole 3D view"
              hint="Past the edges of its box, over the page"
              on={spill}
              onToggle={toggleSpill}
            />
            <Switch
              label="Zoom in on the soma"
              hint="On the soma's slide, close in on the cell body"
              on={somaZoom}
              onToggle={toggleSomaZoom}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Switch({
  label,
  hint,
  on,
  onToggle,
}: {
  label: string;
  hint: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-800 px-2.5 py-2 text-left transition-colors hover:border-slate-700"
    >
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className="text-xs text-slate-500">{hint}</span>
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          on ? 'bg-sky-500' : 'bg-slate-700'
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4' : ''
          }`}
        />
      </span>
    </button>
  );
}
