import { useCallback, useState } from 'react';

/**
 * The cell pointed out in the raster and the scene: a table row under the
 * pointer while the table is on show, else the cell last clicked in either.
 */
export function useCellFocus({
  populationName,
  tableShown,
}: {
  populationName: string;
  tableShown: boolean;
}) {
  // The table row under the pointer, pointed out in the raster and the scene.
  const [hoveredCell, setHoveredCell] = useState<{ population: string; cell: number } | null>(null);
  const handleHoveredCell = useCallback(
    (cell: number | null) =>
      setHoveredCell(
        cell === null || !populationName ? null : { population: populationName, cell }
      ),
    [populationName]
  );
  const hoveredRow =
    tableShown && hoveredCell?.population === populationName ? hoveredCell.cell : null;
  // A cell clicked in the scene or the raster: pointed out in both, and found
  // in the table. A second click on it lets it go; a table row under the
  // pointer takes its place while it is there.
  const [clickedCell, setClickedCell] = useState<{
    population: string;
    nodeId: number;
    key: number;
  } | null>(null);
  const handleCellClick = useCallback(
    (cell: number | null) => {
      if (cell === null) {
        setClickedCell(null);
        return;
      }
      if (!populationName) return;
      setClickedCell((previous) =>
        previous?.population === populationName && previous.nodeId === cell
          ? null
          : { population: populationName, nodeId: cell, key: (previous?.key ?? 0) + 1 }
      );
    },
    [populationName]
  );
  const focusedCell = clickedCell?.population === populationName ? clickedCell : null;
  const releaseCell = useCallback(() => setClickedCell(null), []);

  return {
    handleHoveredCell,
    handleCellClick,
    /** The cell clicked, while it is of the population on show. */
    focusedCell,
    highlightedCell: hoveredRow ?? focusedCell?.nodeId ?? null,
    releaseCell,
  };
}
