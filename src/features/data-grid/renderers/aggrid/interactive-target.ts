/**
 * Selector for cell content that owns its own click: per-row action buttons,
 * links, form controls and anything exposing a button role.
 */
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [role="button"]';

/**
 * True when a grid click originated inside interactive cell content, in which case
 * the grid must NOT open/select the row.
 *
 * AG Grid's own DOM listener fires BEFORE any React synthetic handler, so a
 * `stopPropagation()` inside the cell cannot protect the row — the grid has to
 * inspect the event target itself.
 *
 * The target is narrowed to {@link Element}, NOT `HTMLElement`: an icon-only button
 * is usually clicked ON ITS `<svg>` glyph, and `SVGElement` is not an `HTMLElement`.
 * `Element.closest()` exists on both and walks out of the SVG into the button.
 */
export function isInteractiveClick(event: Event | null | undefined): boolean {
  const target = event?.target;
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}
