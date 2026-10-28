import { useCallback, useLayoutEffect, useRef } from 'react';

/** How long the scene has to say a tap picked a cell before it counts as a tap on nothing. */
const SCENE_PICK_WAIT_MS = 300;

/**
 * A tap on a 3D scene's empty space, which lets a cell picked in it go. The
 * scene says nothing for one, only for a tap on a cell, so a tap on its canvas
 * that no cell click follows within a moment is taken for one.
 *
 * The handlers go on a box around the scene, on capture: the viewers keep
 * their own pointer events from bubbling. The scene's cell clicks report
 * through `cellClicked`, so a tap on a cell is told apart.
 */
export function useEmptySceneTap(onEmptyTap: () => void) {
  const latest = useRef(onEmptyTap);
  useLayoutEffect(() => {
    latest.current = onEmptyTap;
  });
  const lastCellClickRef = useRef(0);
  const pressRef = useRef<{ x: number; y: number } | null>(null);

  const onPointerDownCapture = useCallback((e: React.PointerEvent) => {
    pressRef.current =
      e.button === 0 && e.target instanceof HTMLCanvasElement
        ? { x: e.clientX, y: e.clientY }
        : null;
  }, []);
  const onPointerUpCapture = useCallback((e: React.PointerEvent) => {
    const press = pressRef.current;
    pressRef.current = null;
    // A drag turns the view; only a tap in place picks.
    if (!press || Math.hypot(e.clientX - press.x, e.clientY - press.y) > 5) return;
    const at = performance.now();
    window.setTimeout(() => {
      if (lastCellClickRef.current < at) latest.current();
    }, SCENE_PICK_WAIT_MS);
  }, []);
  const cellClicked = useCallback(() => {
    lastCellClickRef.current = performance.now();
  }, []);

  return { onPointerDownCapture, onPointerUpCapture, cellClicked };
}
