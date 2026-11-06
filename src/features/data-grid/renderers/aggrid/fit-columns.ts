/**
 * Columns sized to their content (`IWidthSpec.fitContent`), measured and planned apart from
 * AG Grid's `autoSizeColumns`. That applies each natural width at once and any cap only
 * afterwards, so every column to the right of a capped one jumped twice per fit.
 */

export interface IFittedColumn {
  id: string;
  /** the width its header and rendered cells need */
  natural: number;
  maxWidth?: number;
  minWidth?: number;
}

/**
 * The width each fitted column takes: its content's, within its caps, and if the row would
 * still overrun the grid, the capped columns (long text, which can clip) give back the
 * difference, widest first and never below `floor`.
 */
export function planColumnWidths({
  columns,
  fixedWidth,
  available,
  floor,
}: {
  columns: ReadonlyArray<IFittedColumn>;
  /** what the grid's other, unpinned columns take */
  fixedWidth: number;
  /** the width of the grid's centre, between its pinned columns */
  available: number;
  floor: number;
}): Map<string, number> {
  const widths = new Map(
    columns.map(({ id, natural, maxWidth, minWidth }) => [
      id,
      Math.max(minWidth ?? 0, Math.min(natural, maxWidth ?? Number.POSITIVE_INFINITY)),
    ])
  );
  let overrun =
    fixedWidth + [...widths.values()].reduce((sum, width) => sum + width, 0) - available;
  const shrinkable = columns
    .filter(({ maxWidth }) => maxWidth != null)
    .sort((a, b) => (widths.get(b.id) ?? 0) - (widths.get(a.id) ?? 0));
  for (const { id, minWidth } of shrinkable) {
    if (overrun <= 0) break;
    const width = widths.get(id) ?? 0;
    const given = Math.min(overrun, Math.max(0, width - Math.max(minWidth ?? 0, floor)));
    widths.set(id, width - given);
    overrun -= given;
  }
  return widths;
}

/**
 * The width each column's header and rendered cells need, measured as AG Grid's own
 * autosize does: copies of them, unconstrained, in a hidden box inside the grid, so the
 * grid's styles still apply.
 */
export function measureContentWidths(
  root: HTMLElement,
  ids: ReadonlyArray<string>
): Map<string, number> {
  const widths = new Map<string, number>();
  const host = root.querySelector<HTMLElement>('.ag-center-cols-container');
  if (!host) return widths;

  for (const id of ids) {
    const key = CSS.escape(id);
    const parts = [
      ...root.querySelectorAll<HTMLElement>(`.ag-header-cell[col-id="${key}"]`),
      ...root.querySelectorAll<HTMLElement>(`.ag-row .ag-cell[col-id="${key}"]`),
    ];
    if (parts.length === 0) continue;

    const probe = document.createElement('form');
    probe.style.position = 'fixed';
    probe.style.visibility = 'hidden';
    for (const part of parts) {
      const copy = part.cloneNode(true) as HTMLElement;
      copy.style.width = '';
      copy.style.position = 'static';
      copy.style.left = '';
      // the classes a cell's look hangs from, which a bare copy would lose
      const holder = document.createElement('div');
      if (part.classList.contains('ag-header-cell')) {
        holder.className = 'ag-header ag-header-row';
        holder.style.position = 'static';
      } else {
        holder.className = 'ag-row';
      }
      holder.appendChild(copy);
      probe.appendChild(holder);
    }
    host.appendChild(probe);
    widths.set(id, Math.ceil(probe.getBoundingClientRect().width));
    probe.remove();
  }
  return widths;
}
