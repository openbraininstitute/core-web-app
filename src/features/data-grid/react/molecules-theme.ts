/**
 * Shared className overrides pinning the data-grid's `ui/molecules` Select and Input
 * surfaces to a quiet look, without touching the shared components: their semantic
 * tokens (`border`, `bg-popover`, `focus:bg-accent`) render dark and square in this theme.
 */

/**
 * Grid overlays portal to `document.body`, as does `ui/molecules/modal` — whose dialog
 * sits at 1001. Popover's own `z-50` therefore opens BEHIND the dialog inside a modal.
 * 1002 matches what `PortalRegionBanner` already uses; nothing occupies 1002–99998.
 * Two ranks because these surfaces nest: a filter editor's Select portals to the body
 * too, so it must clear the panel that opened it, not just the modal.
 */
export const GRID_OVERLAY_Z_CLASS = 'z-1002';

/** Numeric twin of {@link GRID_OVERLAY_Z_CLASS}, for APIs taking a `zIndex` (antd). */
export const GRID_OVERLAY_Z_INDEX = 1002;

/** Overlays opened from INSIDE a grid overlay (operator Select, date calendar). */
export const GRID_NESTED_OVERLAY_Z_CLASS = 'z-1003';

/** Trigger button: hairline border, white surface, rounded-xl. */
export const GRID_SELECT_TRIGGER_CLASS =
  'rounded-xl border-gray-200 bg-white text-sm shadow-none data-placeholder:text-gray-400';

/** Dropdown panel: hairline border, white surface, soft elevation, generous radius. */
export const GRID_SELECT_CONTENT_CLASS = `rounded-xl border-gray-200 bg-white p-1.5 shadow-lg ${GRID_NESTED_OVERLAY_Z_CLASS}`;

/**
 * Dropdown panel pinned to exactly the trigger's width. The molecule uses Radix's
 * `--radix-select-trigger-width` only as a `min-w`, so a long option makes the panel
 * outgrow its trigger — which looks broken in a fixed-width filter popover.
 */
export const GRID_SELECT_CONTENT_MATCH_TRIGGER_CLASS = `${GRID_SELECT_CONTENT_CLASS} w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width)`;

/** Dropdown row: rounded hover/active highlight in a calm gray. */
export const GRID_SELECT_ITEM_CLASS =
  'rounded-lg py-1.5 focus:bg-gray-100 focus:text-primary-8 data-[state=checked]:font-medium';

/** Text/search input: hairline border, white surface, no ring noise. */
export const GRID_INPUT_CLASS =
  'h-9 rounded-xl border-gray-200 bg-white text-sm shadow-none! ring-0 focus-visible:border-primary-6! focus-visible:ring-0! focus-visible:shadow-none!';
