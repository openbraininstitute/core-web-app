/** Between a card and the row it goes with, px. */
const GAP = 10;
/** The least room a card keeps from the window's edge, px. */
const EDGE = 8;

export interface Placement {
  side: 'left' | 'right' | 'bottom';
  sideOffset: number;
  alignOffset: number;
}

/**
 * Where a Radix popover anchored on `el` puts a card `width` wide so that it sits beside the row `el` is in (its
 * `data-help-anchor`), top to top: on the right where the window has room, else on the left. The offsets hold for
 * that side only, so the side is chosen here rather than flipped by the popper. Where neither side has room (a
 * phone), the card drops below the row instead, where the popper can flip and shift it as it would any dropdown.
 */
export function besideRow(el: HTMLElement, width: number): Placement {
  const own = el.getBoundingClientRect();
  const row = (el.closest('[data-help-anchor]') ?? el).getBoundingClientRect();
  const alignOffset = row.top - own.top;
  const room = width + GAP + EDGE;
  if (window.innerWidth - row.right >= room) {
    return { side: 'right', sideOffset: row.right - own.right + GAP, alignOffset };
  }
  if (row.left >= room) return { side: 'left', sideOffset: own.left - row.left + GAP, alignOffset };
  return {
    side: 'bottom',
    sideOffset: row.bottom - own.bottom + 4,
    alignOffset: row.left - own.left,
  };
}
