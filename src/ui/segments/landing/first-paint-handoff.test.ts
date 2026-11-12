import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  firstPaintReady,
  firstPaintShown,
  LANDING_WORDS_IN_MS,
  wordsBegan,
} from './first-paint-handoff';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div data-landing-first-paint><span>Neuroscience at the</span></div>';
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

it('keeps the first-paint copy until the live words and logo are in and its entrance is over', () => {
  expect(firstPaintShown()).toBe(true);
  firstPaintReady('words');
  vi.advanceTimersByTime(5000);
  expect(firstPaintShown()).toBe(true);
  firstPaintReady('logo');
  vi.advanceTimersByTime(LANDING_WORDS_IN_MS - 100);
  expect(firstPaintShown()).toBe(true);
  vi.advanceTimersByTime(200);
  expect(firstPaintShown()).toBe(false);
  expect(document.querySelector('[data-landing-first-paint]')).toHaveAttribute('data-handed-off');
});

it('times the words from now where there is no copy or no animation to read', () => {
  document.body.innerHTML = '';
  expect(firstPaintShown()).toBe(false);
  expect(() => firstPaintReady('words')).not.toThrow();
  const before = performance.now();
  expect(wordsBegan(document.createElement('span'))).toBeGreaterThanOrEqual(before);
});
