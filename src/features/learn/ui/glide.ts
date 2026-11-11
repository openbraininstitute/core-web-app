/** How long an item takes to glide to its new place, ms. */
const GLIDE_MS = 320;

/**
 * A ref for a list laid out on a grid: when a change in its width changes how many columns it
 * has, each item glides from where it was to where the new columns put it, rather than jumping
 * there. Its places are taken as the list is resized, so "where it was" is the frame before.
 */
export function glide(list: HTMLElement | null) {
  if (!list) return;
  let columns = 0;
  let places = new Map<Element, [number, number]>();
  const observer = new ResizeObserver(() => {
    const now = new Map<Element, [number, number]>();
    for (const item of list.children)
      if (item instanceof HTMLElement) now.set(item, [item.offsetLeft, item.offsetTop]);
    const count = getComputedStyle(list).gridTemplateColumns.split(' ').length;
    if (
      columns &&
      count !== columns &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      for (const [item, [x, y]] of now) {
        const was = places.get(item);
        if (!was || (was[0] === x && was[1] === y)) continue;
        item.animate(
          [{ transform: `translate(${was[0] - x}px, ${was[1] - y}px)` }, { transform: 'none' }],
          { duration: GLIDE_MS, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' }
        );
      }
    columns = count;
    places = now;
  });
  observer.observe(list);
  return () => observer.disconnect();
}
