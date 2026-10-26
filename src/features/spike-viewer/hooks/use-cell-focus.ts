import { useCallback, useRef, useState } from 'react';

/** How long the scene has to say a tap picked a cell before it counts as a tap on nothing. */
const SCENE_PICK_WAIT_MS = 300;

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
  const lastCellClickRef = useRef(0);
  // The scene says nothing for a tap on empty space, so a tap on its canvas
  // that no cell click follows lets the clicked cell go. Read on capture: the
  // viewers keep their own pointer events from bubbling.
  const sceneTapRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const handleScenePointerDown = (e: React.PointerEvent) => {
    sceneTapRef.current =
      e.button === 0 && e.target instanceof HTMLCanvasElement
        ? { x: e.clientX, y: e.clientY, at: performance.now() }
        : null;
  };
  const handleScenePointerUp = (e: React.PointerEvent) => {
    const tap = sceneTapRef.current;
    sceneTapRef.current = null;
    if (!tap || Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 5) return;
    const at = performance.now();
    window.setTimeout(() => {
      if (lastCellClickRef.current < at) setClickedCell(null);
    }, SCENE_PICK_WAIT_MS);
  };
  const handleCellClick = useCallback(
    (cell: number | null) => {
      lastCellClickRef.current = performance.now();
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

  return {
    handleHoveredCell,
    handleCellClick,
    handleScenePointerDown,
    handleScenePointerUp,
    /** The cell clicked, while it is of the population on show. */
    focusedCell,
    highlightedCell: hoveredRow ?? focusedCell?.nodeId ?? null,
    releaseCell: () => setClickedCell(null),
  };
}
