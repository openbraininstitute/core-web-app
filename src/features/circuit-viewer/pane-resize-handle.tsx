/**
 * The grab bar between a viewer and the pane docked under it.
 *
 * Reports the height the bottom pane should take, measured from the bottom of
 * `containerRef` — so the caller keeps owning where that height is stored.
 */
export function PaneResizeHandle({
  containerRef,
  minHeight,
  onResize,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  minHeight: number;
  onResize: (height: number) => void;
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const { bottom: containerBottom, height: containerHeight } = container.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);

    function onPointerMove(ev: PointerEvent) {
      const raw = containerBottom - ev.clientY;
      onResize(Math.min(containerHeight, Math.max(minHeight, raw)));
    }
    function onPointerUp(ev: PointerEvent) {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      try {
        (ev.target as Element | null)?.releasePointerCapture?.(ev.pointerId);
      } catch {}
    }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className="group absolute left-0 right-0 -top-2 z-10 flex h-4 cursor-ns-resize items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <div className="h-1 w-14 rounded-full bg-neutral-400 transition-all group-hover:w-16 group-hover:bg-neutral-600" />
    </div>
  );
}
