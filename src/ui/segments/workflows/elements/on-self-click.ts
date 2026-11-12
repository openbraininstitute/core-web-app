import type { MouseEvent } from 'react';

/**
 * A click handler for an element's own surface: it leaves alone a click on anything inside
 * the element, so what is inside needs no telling apart.
 */
export function onSelfClick(handler: (() => void) | undefined) {
  return handler
    ? (event: MouseEvent) => {
        if (event.target === event.currentTarget) handler();
      }
    : undefined;
}
