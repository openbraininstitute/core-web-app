// Adds the `@testing-library/jest-dom` matchers (toBeInTheDocument, etc.) to
// vitest's `expect`, and cleans up the DOM between tests.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// Files in the `shared` project (vitest.config.ts) reuse one worker, so undo the
// global state a file can leave behind before the next file runs there.
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
});

// jsdom is missing a few browser APIs that Radix UI primitives (Select, Tooltip)
// touch on mount, so polyfill them here for `.spec.tsx` component tests.
if (typeof window !== 'undefined') {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= vi.fn();
  Element.prototype.hasPointerCapture ??= vi.fn(() => false);
  Element.prototype.setPointerCapture ??= vi.fn();
  Element.prototype.releasePointerCapture ??= vi.fn();
  // antd's responsive components (Pagination size changer, Grid) read matchMedia
  // on mount; jsdom omits it.
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList;
}
