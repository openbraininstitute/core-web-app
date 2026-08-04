/**
 * Shared className overrides that give the data-grid's `ui/molecules` Select and
 * Input surfaces a consistent, quiet look: a hairline gray-200 border, a white
 * background, and rounded hover/active rows. The molecules primitives default to
 * semantic tokens (`border`, `bg-popover`, `focus:bg-accent`) which render as a
 * dark border and a square highlight in this app's theme — these strings pin the
 * appearance without touching the shared component.
 */

/**
 * STACKING — the grid must work inside a modal.
 *
 * Every floating grid surface (the toolbar's advanced-filters popover, a column
 * header's filter popover, the column chooser) is PORTALLED to `document.body`, and
 * so is `ui/molecules/modal` — whose dialog is `zIndex: zIndex + 1`, i.e. **1001**
 * with the default `zIndex = 1000` (`ui/molecules/modal/index.tsx`). Two body-level
 * siblings order by z-index alone, and `ui/molecules/popover` ships `z-50`, so inside
 * a modal (the workflow entity pickers) the popover opened BEHIND the dialog and read
 * as "the button does nothing".
 *
 * These two ranks put the grid's surfaces above that dialog. `1002` is not invented
 * here: it is the number `PortalRegionBanner` already uses for exactly this reason
 * (`features/brain-region-hierarchy/components/region-banner.tsx`). Nothing in the app
 * occupies 1002–99998, so elevating unconditionally costs nothing outside a modal —
 * and the alternatives are worse: portalling into `#modal-dialog` would clip the
 * popover inside the modal body's `overflow-auto`, and raising `ui/molecules/popover`
 * itself would move every popover in the app.
 *
 * TWO ranks, because these surfaces NEST: the operator/option `Select` and the date
 * calendar inside a filter editor portal to the body too, so they must clear the
 * panel that opened them, not just the modal.
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
 * Dropdown panel pinned to EXACTLY the trigger's width. Radix publishes the measured
 * trigger width as `--radix-select-trigger-width` on the content element; the molecule
 * only uses it as a `min-w` (so a long option makes the panel wider than its trigger).
 * Filter editors render full-width triggers inside a fixed-width popover, where a panel
 * that outgrows its trigger looks broken — this pins width (and overrides the molecule's
 * `min-w-[8rem]` via tailwind-merge) instead of hardcoding a px value.
 */
export const GRID_SELECT_CONTENT_MATCH_TRIGGER_CLASS = `${GRID_SELECT_CONTENT_CLASS} w-(--radix-select-trigger-width) min-w-(--radix-select-trigger-width)`;

/** Dropdown row: rounded hover/active highlight in a calm gray. */
export const GRID_SELECT_ITEM_CLASS =
  'rounded-lg py-1.5 focus:bg-gray-100 focus:text-primary-8 data-[state=checked]:font-medium';

/** Text/search input: hairline border, white surface, no ring noise. */
export const GRID_INPUT_CLASS =
  'h-9 rounded-xl border-gray-200 bg-white text-sm shadow-none! ring-0 focus-visible:border-primary-6! focus-visible:ring-0! focus-visible:shadow-none!';
