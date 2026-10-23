import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { CellColors, Population, SectionColors } from './types';

/** No cell has a colour of its own: each is in the view's own colour. */
export const NO_CELL_COLORS: CellColors = { palette: [], columnByCell: new Uint16Array(0) };

/** Each population's cells in the page's numbering, from its first to the one after its last. */
export function populationRanges(
  populations: readonly Population[]
): { name: string; first: number; end: number }[] {
  let first = 0;
  return populations.map(({ name, cells }) => {
    const range = { name, first, end: first + cells };
    first = range.end;
    return range;
  });
}

/** The population the cell numbered `cell` is of; undefined past the last. */
export function populationAt(populations: readonly Population[], cell: number): string | undefined {
  return populationRanges(populations).find(({ end }) => cell < end)?.name;
}

export interface CellColorsOptions {
  /** In the page's order, which numbers the cells. */
  populations: readonly Population[];
  /** The population on show. */
  subject: string | undefined;
  /** The colour-by mapping, of the population on show's cells. */
  nodeColors?: NodeColors;
  /** What the cells of the population on show are in where the mapping has no colour for them; null for the view's. */
  own?: string | SectionColors | null;
  /** What the other populations' cells are in; the view's own colour without it. */
  receded?: string;
  hidden: ReadonlySet<string>;
}

/**
 * A palette and each cell's column of it, from what the page knows of the cells. The mapping's palette comes first, at
 * its own indices, so that its columns are copied as they are: at region scale a selection change costs one copy of
 * a typed array. Each colour of our own then takes a column on first use: `own`, the receded colour, and `false` for
 * the cells of a hidden population, which are not drawn, nor picked.
 */
export function cellColorsOf({
  populations,
  subject,
  nodeColors,
  own = null,
  receded,
  hidden,
}: CellColorsOptions): CellColors {
  if (!nodeColors && own === null && !receded && hidden.size === 0) return NO_CELL_COLORS;

  const palette: CellColors['palette'] = nodeColors ? [...nodeColors.palette] : [];
  const columns = new Map<CellColors['palette'][number], number>();
  const columnOf = (color: CellColors['palette'][number]) => {
    let column = columns.get(color);
    if (column === undefined) {
      column = palette.push(color) - 1;
      columns.set(color, column);
    }
    return column;
  };
  const ranges = populationRanges(populations);
  const columnByCell = new Uint16Array(ranges.at(-1)?.end ?? 0);
  for (const { name, first, end } of ranges) {
    if (hidden.has(name)) {
      columnByCell.fill(columnOf(false), first, end);
    } else if (name === subject) {
      const mapped = Math.min(end - first, nodeColors?.columnByNode.length ?? 0);
      if (nodeColors) columnByCell.set(nodeColors.columnByNode.subarray(0, mapped), first);
      if (first + mapped < end) columnByCell.fill(columnOf(own), first + mapped, end);
    } else {
      columnByCell.fill(columnOf(receded ?? null), first, end);
    }
  }
  return { palette, columnByCell };
}
