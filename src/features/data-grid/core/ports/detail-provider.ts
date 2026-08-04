/**
 * The detail port for expandable rows: whether a row can expand and how to fetch its
 * payload. The schema's `detail.rendererKey` selects the React renderer.
 */
export interface IDetailProvider<Row, Detail = unknown> {
  canExpand(row: Row): boolean;
  /** async detail payload; omit when the renderer works from the row alone */
  fetch?(row: Row, signal?: AbortSignal): Promise<Detail>;
}
