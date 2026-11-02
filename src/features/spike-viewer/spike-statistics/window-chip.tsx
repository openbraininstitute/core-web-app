import { RiCloseLine, RiZoomInLine } from '@remixicon/react';

import { PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

/**
 * A plot's zoom that a table and its statistics follow, beside the table's
 * count: its span, and the cells in it where the zoom picks some. A click lets
 * it go. Short of room it gives way, its words cut short before its ×; its
 * name, "Raster window", is in its hover.
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
      title={`${name} · ${parts.join(' · ')}: ${title}`}
      className={cn(PILL_CLASS, 'min-w-0 whitespace-nowrap')}
    >
      <RiZoomInLine className="size-4 shrink-0" />
      {/* Its span first, so cut short it still says it; which window it is is in the hover. */}
      <span className="min-w-0 truncate">{parts.join(' · ')}</span>
      <RiCloseLine className="size-4 shrink-0 opacity-70" />
    </button>
  );
}
