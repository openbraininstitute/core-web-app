/**
 * The grab bar between a viewer and the pane docked under it.
 *
 * On the bottom pane's top edge, by default, it reports the height that pane
 * should take, measured from the bottom of `containerRef`. On the `bottom`
 * edge of a pane over another it reports that pane's height, measured from the
 * top of `containerRef`, and leaves its ceiling to the caller. Either way the
 * caller keeps owning where the height is stored.
 */
export function PaneResizeHandle({
  containerRef,
  minHeight,
  onResize,
  edge = 'top',
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  minHeight: number;
  onResize: (height: number) => void;
  edge?: 'top' | 'bottom';
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const {
      top: containerTop,
      bottom: containerBottom,
      height: containerHeight,
    } = container.getBoundingClientRect();
    followDrag(e, (ev) => {
      if (edge === 'bottom') {
        onResize(Math.max(minHeight, ev.clientY - containerTop));
        return;
      }
      const raw = containerBottom - ev.clientY;
      onResize(Math.min(containerHeight, Math.max(minHeight, raw)));
    });
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className={`group absolute left-0 right-0 ${edge === 'bottom' ? '-bottom-2' : '-top-2'} z-10 flex h-4 cursor-ns-resize items-center justify-center`}
      style={{ touchAction: 'none' }}
    >
      <div className="h-1 w-14 rounded-full bg-neutral-400 transition-all group-hover:w-16 group-hover:bg-neutral-600" />
    </div>
  );
}

/**
 * The same grab bar on its side, between two panes side by side.
 *
 * Reports where the rule between them should go, measured from the left of
 * `containerRef`, and when a drag starts and ends: a host that animates the
 * panes holds that off while they follow the pointer.
 */
export function PaneSideResizeHandle({
  containerRef,
  minWidth,
  onResize,
  onDragChange,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Room kept either side of the rule. */
  minWidth: number;
  onResize: (left: number) => void;
  onDragChange?: (dragging: boolean) => void;
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const { left: containerLeft, width: containerWidth } = container.getBoundingClientRect();
    onDragChange?.(true);
    followDrag(
      e,
      (ev) => {
        const raw = ev.clientX - containerLeft;
        onResize(Math.min(containerWidth - minWidth, Math.max(minWidth, raw)));
      },
      () => onDragChange?.(false)
    );
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className="group absolute top-0 bottom-0 -left-2 z-10 flex w-4 cursor-ew-resize items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <div className="h-14 w-1 rounded-full bg-neutral-400 transition-all group-hover:h-16 group-hover:bg-neutral-600" />
    </div>
  );
}

/** Reports every pointer move of a drag begun on a grab bar, until the button comes up. */
function followDrag(
  e: React.PointerEvent<HTMLDivElement>,
  onMove: (ev: PointerEvent) => void,
  onEnd?: () => void
) {
  e.currentTarget.setPointerCapture(e.pointerId);
  function onPointerUp(ev: PointerEvent) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    try {
      (ev.target as Element | null)?.releasePointerCapture?.(ev.pointerId);
    } catch {}
    onEnd?.();
  }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}
