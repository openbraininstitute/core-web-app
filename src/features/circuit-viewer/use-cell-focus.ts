import { useCallback, useState } from 'react';

import { useEmptySceneTap } from '@/features/circuit-viewer/use-empty-scene-tap';

/**
 * The cell pointed out in the scene, and in a raster beside it: a table row
 * under the pointer while the table is on show, else the cell last clicked.
 */
export function useCellFocus({
  populationName,
  tableShown,
}: {
  populationName: string;
  tableShown: boolean;
}) {
  // The table row under the pointer, pointed out in the scene and any raster.
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
  // A cell clicked in the scene or a raster: pointed out in both, and found
  // in the table. A second click on it lets it go; a table row under the
  // pointer takes its place while it is there.
  const [clickedCell, setClickedCell] = useState<{
    population: string;
    nodeId: number;
    key: number;
  } | null>(null);
  // A tap on the scene's empty space lets the clicked cell go.
  const sceneTap = useEmptySceneTap(() => setClickedCell(null));
  const { cellClicked } = sceneTap;
  const handleCellClick = useCallback(
    (cell: number | null) => {
      cellClicked();
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
    [populationName, cellClicked]
  );
  const focusedCell = clickedCell?.population === populationName ? clickedCell : null;

  return {
    handleHoveredCell,
    handleCellClick,
    handleScenePointerDown: sceneTap.onPointerDownCapture,
    handleScenePointerUp: sceneTap.onPointerUpCapture,
    /** The cell clicked, while it is of the population on show. */
    focusedCell,
    highlightedCell: hoveredRow ?? focusedCell?.nodeId ?? null,
    releaseCell: () => setClickedCell(null),
  };
}
