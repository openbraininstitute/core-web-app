/** Cell content that owns its own click: action buttons, links, form controls. */
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [role="button"]';

/**
 * True when a grid click originated inside interactive cell content, in which case the
 * grid must not open/select the row.
 *
 * AG Grid's DOM listener fires BEFORE any React synthetic handler, so `stopPropagation()`
 * inside the cell cannot protect the row — the grid must inspect the target itself.
 * Narrowed to {@link Element}, not `HTMLElement`: an icon-only button is clicked on its
 * `<svg>` glyph, and `SVGElement` is not an `HTMLElement`.
 */
export function isInteractiveClick(event: Event | null | undefined): boolean {
  const target = event?.target;
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}
