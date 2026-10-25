import { RiCloseLine, RiZoomInLine } from '@remixicon/react';

import { PILL_CLASS } from '@/ui/molecules/select/pill-select';

/**
 * A plot's zoom that a table and its statistics follow, beside the table's
 * count: its span, and the cells in it where the zoom picks some. A click lets
 * it go.
 */
export function WindowChip({
  name,
  title,
  time,
  cells,
  onClear,
}: {
  /** Which plot's zoom it is: "Raster window". */
  name: string;
  /** What following it means, and that a click lets it go. */
  title: string;
  time: [number, number] | null;
  cells: number | null;
  onClear?: () => void;
}) {
  const parts = [
    time && `${time[0].toFixed(1)}–${time[1].toFixed(1)} ms`,
    cells !== null && `${cells.toLocaleString()} ${cells === 1 ? 'cell' : 'cells'}`,
  ].filter(Boolean);
  return (
    <button
      type="button"
      onClick={onClear}
      title={title}
      className={`${PILL_CLASS} whitespace-nowrap`}
    >
      <RiZoomInLine className="size-4" />
      {name} · {parts.join(' · ')}
      <RiCloseLine className="size-4 opacity-70" />
    </button>
  );
}
