import { describe, expect, it } from 'vitest';

import { cellColorsOf, NO_CELL_COLORS } from '@/features/circuit-viewer/morphologies/cell-colors';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';

const POPULATIONS = [
  { name: 'cortex', cells: 3 },
  { name: 'thalamus', cells: 2 },
  { name: 'inputs', cells: 1 },
];
const NONE = new Set<string>();
const columns = ({ palette, columnByCell }: ReturnType<typeof cellColorsOf>) =>
  Array.from(columnByCell, (column) => palette[column]);

describe("the cells' colours", () => {
  it("leave every cell to the view's own colour, as one object, where there is nothing to say", () => {
    expect(cellColorsOf({ populations: POPULATIONS, subject: 'cortex', hidden: NONE })).toBe(
      NO_CELL_COLORS
    );
  });

  it("copy the mapping's columns at its own indices, and give the rest a column of their own each", () => {
    const colors = cellColorsOf({
      populations: POPULATIONS,
      subject: 'cortex',
      nodeColors: { palette: ['#111111', '#222222'], columnByNode: Uint16Array.of(1, 0, 1) },
      receded: '#cccccc',
      hidden: new Set(['inputs']),
    });
    expect(Array.from(colors.columnByCell.subarray(0, 3))).toEqual([1, 0, 1]);
    expect(columns(colors)).toEqual(['#222222', '#111111', '#222222', '#cccccc', '#cccccc', false]);
    expect(colors.palette).toEqual(['#111111', '#222222', '#cccccc', false]);
  });

  it("leave the other populations in the view's own colour where none recedes", () => {
    const colors = cellColorsOf({
      populations: POPULATIONS,
      subject: 'thalamus',
      hidden: new Set(['inputs']),
    });
    expect(columns(colors)).toEqual([null, null, null, null, null, false]);
  });

  it('draw a lone cell in section colours where the mapping says nothing of it', () => {
    const lone = [{ name: 'neuron', cells: 1 }];
    const sections = SECTION_TYPE_COLORS;
    expect(
      columns(cellColorsOf({ populations: lone, subject: 'neuron', own: sections, hidden: NONE }))
    ).toEqual([sections]);
    expect(
      columns(
        cellColorsOf({
          populations: lone,
          subject: 'neuron',
          nodeColors: { palette: [], columnByNode: new Uint16Array(0) },
          own: sections,
          hidden: NONE,
        })
      )
    ).toEqual([sections]);
    // The mapping wins where it has a colour.
    expect(
      columns(
        cellColorsOf({
          populations: lone,
          subject: 'neuron',
          nodeColors: { palette: ['#123456'], columnByNode: Uint16Array.of(0) },
          own: sections,
          hidden: NONE,
        })
      )
    ).toEqual(['#123456']);
  });

  it('take out the cells of the population on show that are filtered out', () => {
    const colors = cellColorsOf({
      populations: POPULATIONS,
      subject: 'cortex',
      receded: '#cccccc',
      hidden: NONE,
      shownCells: Uint8Array.of(1, 0, 1),
    });
    expect(columns(colors)).toEqual([null, false, null, '#cccccc', '#cccccc', '#cccccc']);
  });

  it('fade the rest of the population on show behind a cell pointed out, which shows filtered or not', () => {
    const pointedOut = {
      populations: POPULATIONS,
      subject: 'cortex',
      nodeColors: { palette: ['#111111'], columnByNode: Uint16Array.of(0, 0, 0) },
      hidden: new Set(['inputs']),
      shownCells: Uint8Array.of(1, 0, 0),
      highlightedCell: 2,
    };
    expect(columns(cellColorsOf({ ...pointedOut, fadedColor: '#d4d4d4' }))).toEqual([
      '#d4d4d4',
      false,
      '#111111',
      null,
      null,
      false,
    ]);
    // Without a colour to fade to, the cell pointed out is shown alone.
    expect(columns(cellColorsOf(pointedOut))).toEqual([false, false, '#111111', null, null, false]);
  });
});
