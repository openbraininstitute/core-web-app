import { useCallback, useState } from 'react';

/**
 * The cell pointed out in the scene, and in a raster beside it: a table row
 * under the pointer while the table is on show, else the cell last clicked.
 * Kept with `scope`, the population the cells are of (and its circuit where
 * that can change), so another one's cell is never pointed out.
 */
export function useCellFocus({ scope, tableShown }: { scope: string; tableShown: boolean }) {
  // The table row under the pointer, pointed out in the scene and any raster.
  const [hoveredCell, setHoveredCell] = useState<{ scope: string; cell: number } | null>(null);
  const handleHoveredCell = useCallback(
    (cell: number | null) => setHoveredCell(cell === null || !scope ? null : { scope, cell }),
    [scope]
  );
  const hoveredRow = tableShown && hoveredCell?.scope === scope ? hoveredCell.cell : null;
  // A cell clicked in the scene or a raster: pointed out in both, and found
  // in the table. A second click on it lets it go; a table row under the
  // pointer takes its place while it is there.
  const [clickedCell, setClickedCell] = useState<{
    scope: string;
    nodeId: number;
    key: number;
  } | null>(null);
  const handleCellClick = useCallback(
    (cell: number | null) => {
      if (cell === null) {
        setClickedCell(null);
        return;
      }
      if (!scope) return;
      setClickedCell((previous) =>
        previous?.scope === scope && previous.nodeId === cell
          ? null
          : { scope, nodeId: cell, key: (previous?.key ?? 0) + 1 }
      );
    },
    [scope]
  );
  const focusedCell = clickedCell?.scope === scope ? clickedCell : null;
  const releaseCell = useCallback(() => setClickedCell(null), []);

  return {
    handleHoveredCell,
    handleCellClick,
    /** The cell clicked, while it is of the scope on show. */
    focusedCell,
    highlightedCell: hoveredRow ?? focusedCell?.nodeId ?? null,
    releaseCell,
  };
}
