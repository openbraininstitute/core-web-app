/**
 * The detail port for expandable rows. The schema's `detail.rendererKey` selects
 * the React renderer; this provider supplies the behaviour (whether a row can
 * expand and how to fetch its detail payload). Nested expansion is realised by a
 * provider whose renderer mounts a child grid (Composite).
 */
export interface DetailProvider<Row, Detail = unknown> {
  canExpand(row: Row): boolean;
  /** async detail payload; omit when the renderer works from the row alone */
  fetch?(row: Row, signal?: AbortSignal): Promise<Detail>;
}
