// Adds the `@testing-library/jest-dom` matchers (toBeInTheDocument, etc.) to
// vitest's `expect`, and cleans up the DOM between tests.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
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
}
