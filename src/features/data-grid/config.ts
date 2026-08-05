/**
 * Should a user's column layout — which columns are shown (the column chooser),
 * the order they were dragged into, and their resized widths — survive closing the
 * browser?
 *
 * `true`  → the layout is written to `localStorage` under `data-grid:v1:l:<instanceKey>`
 *           and restored the next time that same listing is opened.
 * `false` → the layout lives only as long as the grid is mounted; every visit starts
 *           from the schema's defaults. Previously-saved layouts are then ignored,
 *           NOT deleted, so flipping this back on restores what users already had.
 *
 * This is deliberately separate from the SESSION slice (filters, sort, page, search),
 * which always persists for the tab's lifetime and is not affected by this flag —
 * a saved layout is a lasting preference, a filter is a transient act of browsing.
 */
export const PERSIST_COLUMN_LAYOUT = true;
