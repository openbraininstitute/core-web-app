import { describe, expect, it } from 'vitest';

import {
  cellAt,
  cellColorsOf,
  NO_CELL_COLORS,
  pointingOut,
} from '@/features/circuit-viewer/morphologies/cell-colors';
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

  it('point nothing out for a cell out of the population on show', () => {
    for (const highlightedCell of [-1, 3]) {
      expect(
        columns(
          cellColorsOf({
            populations: POPULATIONS,
            subject: 'thalamus',
            receded: '#cccccc',
            hidden: NONE,
            highlightedCell,
            fadedColor: '#d4d4d4',
          })
        )
      ).toEqual(['#cccccc', '#cccccc', '#cccccc', null, null, '#cccccc']);
    }
  });
});

describe('a cell pointed out', () => {
  it('fades the rest among somas and takes it out among morphologies, with no hover there', () => {
    expect(pointingOut(2, false)).toEqual({ fadedColor: '#d4d4d4', hover: true });
    expect(pointingOut(2, false, '#cccccc')).toEqual({ fadedColor: '#cccccc', hover: true });
    expect(pointingOut(2, true)).toEqual({ fadedColor: false, hover: false });
  });

  it('changes nothing where none is', () => {
    expect(pointingOut(undefined, true)).toEqual({ fadedColor: false, hover: true });
    expect(pointingOut(undefined, false)).toEqual({ fadedColor: false, hover: true });
  });
});

describe('a cell by its number', () => {
  it('is of the population its number falls in, at its index there', () => {
    expect(cellAt(POPULATIONS, 0)).toEqual({ name: 'cortex', index: 0 });
    expect(cellAt(POPULATIONS, 4)).toEqual({ name: 'thalamus', index: 1 });
    expect(cellAt(POPULATIONS, 6)).toBeUndefined();
  });
});
