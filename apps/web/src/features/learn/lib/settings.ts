/**
 * What the settings menu saves, in localStorage, and how each setting is put on
 * the course's root element (`[data-learn-root]`) before the first paint — the
 * theme as data-theme, the typewriter as data-typewriter, quieter notes as
 * data-notes — so a course never first shows itself the wrong way.
 *
 * Free of React, because the course page renders the script on the server.
 */

import type { Theme } from '@/features/learn/lib/theme';

const THEME_KEY = 'learn-theme';
const TYPEWRITER_KEY = 'learn-typewriter';
const NOTES_KEY = 'learn-notes';
const SPILL_KEY = 'learn-spill';
const SOMA_KEY = 'learn-soma-zoom';

/** The element the courses' settings and styles hang on: the course page's root. */
export const learnRoot = (): HTMLElement | null =>
  typeof document === 'undefined' ? null : document.querySelector<HTMLElement>('[data-learn-root]');

/**
 * Runs while the HTML is still being parsed, from inside the root's first child, putting the saved settings on
 * the root before anything in it paints. The OBI theme is the default here; only the dark one is marked.
 * The typewriter is on unless switched off.
 */
export const SETTINGS_SCRIPT = `(function(){try{var d=document.currentScript&&document.currentScript.closest("[data-learn-root]");if(!d)return;if(localStorage.getItem(${JSON.stringify(
  THEME_KEY
)})==="dark")d.dataset.theme="dark";if(localStorage.getItem(${JSON.stringify(
  TYPEWRITER_KEY
)})!=="off")d.dataset.typewriter="on";if(localStorage.getItem(${JSON.stringify(
  NOTES_KEY
)})==="quiet")d.dataset.notes="quiet"}catch(e){}})()`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private browsing): the setting still holds until the next load.
  }
}

const listeners = new Set<() => void>();

/** Calls `listener` whenever a setting changes, in this tab or another. For useSyncExternalStore. */
export function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function changed() {
  for (const listener of listeners) listener();
}

function applyTheme(theme: Theme) {
  const root = learnRoot();
  if (!root) return;
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
}

function applyTypewriter(on: boolean) {
  const root = learnRoot();
  if (!root) return;
  if (on) root.dataset.typewriter = 'on';
  else delete root.dataset.typewriter;
}

function applyQuietNotes(on: boolean) {
  const root = learnRoot();
  if (!root) return;
  if (on) root.dataset.notes = 'quiet';
  else delete root.dataset.notes;
}

export function savedTheme(): Theme {
  return read(THEME_KEY) === 'dark' ? 'dark' : 'obi';
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  write(THEME_KEY, theme);
  changed();
}

/** On unless switched off in the settings: a browser that has never opened them types the titles out. */
export function savedTypewriter(): boolean {
  return read(TYPEWRITER_KEY) !== 'off';
}

export function setTypewriter(on: boolean) {
  applyTypewriter(on);
  write(TYPEWRITER_KEY, on ? 'on' : 'off');
  changed();
}

/**
 * Whether walkthrough notes step back from the line — a size smaller, and grey —
 * instead of matching it. Pure CSS (the quiet-notes variant), so nothing re-renders.
 */
export function savedQuietNotes(): boolean {
  return read(NOTES_KEY) === 'quiet';
}

export function setQuietNotes(on: boolean) {
  applyQuietNotes(on);
  write(NOTES_KEY, on ? 'quiet' : 'match');
  changed();
}

/**
 * Whether the walkthrough's 3D figure draws all it holds — past the edges of
 * its box, over the whole page, behind the words, fading out above and below —
 * rather than cut off there. On unless switched off in the settings: a browser
 * that has never opened them (as on a new host, whose storage starts empty)
 * gets the figures unbounded. Outside a course, as on the Learn page's cards,
 * they keep to their box whatever this says (see Embedded). Read by the figure
 * itself, so it needs nothing on <html>.
 */
export function savedSpill(): boolean {
  return read(SPILL_KEY) !== 'off';
}

export function setSpill(on: boolean) {
  write(SPILL_KEY, on ? 'on' : 'off');
  changed();
}

/**
 * Whether the walkthrough's soma slide closes in on the soma, rather than
 * picking it out on the neuron, whole. Read by the figure, like the last.
 */
export function savedSomaZoom(): boolean {
  return read(SOMA_KEY) === 'on';
}

export function setSomaZoom(on: boolean) {
  write(SOMA_KEY, on ? 'on' : 'off');
  changed();
}

/** Puts the saved settings on the root: after a client-side navigation, which runs no inline script, or a remount. */
export function applySaved() {
  applyTheme(savedTheme());
  applyTypewriter(savedTypewriter());
  applyQuietNotes(savedQuietNotes());
}
