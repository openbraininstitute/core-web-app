/**
 * Shared className overrides that give the data-grid's `ui/molecules` Select and
 * Input surfaces a consistent, quiet look: a hairline gray-200 border, a white
 * background, and rounded hover/active rows. The molecules primitives default to
 * semantic tokens (`border`, `bg-popover`, `focus:bg-accent`) which render as a
 * dark border and a square highlight in this app's theme — these strings pin the
 * appearance without touching the shared component.
 */

/** Trigger button: hairline border, white surface, rounded-xl. */
export const GRID_SELECT_TRIGGER_CLASS = 'rounded-xl border-gray-200 bg-white text-sm shadow-none';

/** Dropdown panel: hairline border, white surface, soft elevation, generous radius. */
export const GRID_SELECT_CONTENT_CLASS = 'rounded-xl border-gray-200 bg-white p-1.5 shadow-lg';

/** Dropdown row: rounded hover/active highlight in a calm gray. */
export const GRID_SELECT_ITEM_CLASS =
  'rounded-lg py-1.5 focus:bg-gray-100 focus:text-primary-8 data-[state=checked]:font-medium';

/** Text/search input: hairline border, white surface, no ring noise. */
export const GRID_INPUT_CLASS =
  'h-9 rounded-xl border-gray-200 bg-white text-sm shadow-none! ring-0 focus-visible:border-primary-6! focus-visible:ring-0! focus-visible:shadow-none!';
