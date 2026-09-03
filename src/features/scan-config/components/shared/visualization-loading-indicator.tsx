import { LoadingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';
import { formatBytes } from '@/utils/format';

import type { DownloadProgress } from '@/features/circuit-nodes/types';

/** What the wait is called before anything has said what it is. */
const LOADING_LABEL = 'Loading visualization…';

/**
 * How long a wait has to last before it is worth a word.
 *
 * Whether the data was already in hand cannot be asked directly: the nodes
 * registry may hold a live session, the browser may serve the file from its own
 * cache, and morphoviewer may answer a cell it has already drawn. What can be
 * asked is whether the user is still waiting, and a wait this short is not one.
 *
 * The veil waits too, so switching populations leaves the previous scene on
 * screen instead of flashing white over it.
 */
export const QUIET_MS = 300;

interface VisualizationLoadingIndicatorProps {
  /** Node-file bytes still coming, summed over the files being read. */
  download?: DownloadProgress | null;
  /** Morphologies drawn so far, once the nodes are in. */
  morphologies?: { loaded: number; total: number };
  className?: string;
}

/**
 * Covers a scene that is not ready, and names the phase it is waiting in.
 *
 * The two phases are never blended into one percentage: bytes and cells share
 * no denominator, so any weighting between them is a guess, and the guess is
 * the bar that sticks at 70% and then sprints. A viewer with no morphologies to
 * draw has no second phase, and one with no node files to read has no first.
 */
export function VisualizationLoadingIndicator({
  download,
  morphologies,
  className,
}: VisualizationLoadingIndicatorProps) {
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), QUIET_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!waited) return null;

  const { label, percent } = phase(download, morphologies);

  return (
    <div
      className={cn(
        // Cover the canvas until neurites replace soma placeholders; chip stays top-center.
        'absolute inset-0 z-10 bg-white/90 backdrop-blur-[1px]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="absolute inset-x-0 top-3 flex justify-center px-3">
        <div
          className={cn(
            'flex flex-col gap-1.5 bg-white/90 px-3 py-1.5 text-sm text-primary-9 shadow-md ring-1 ring-black/5 backdrop-blur',
            // Sized to the label it carries: the byte counts change width as
            // they climb, and a fixed width wide enough for "1000 MB of 1000 MB"
            // would leave the shorter phases rattling around in it. The
            // floor keeps the bar from being a stub on a short label.
            percent === null ? 'rounded-full' : 'min-w-56 rounded-xl'
          )}
        >
          <div className="flex items-center gap-2">
            <LoadingOutlined spin />
            {/* One line: the counts read as a pair, and a wrap that puts "of 180 MB"
                under "Downloading nodes… 42 MB" breaks that in two. */}
            <span className="whitespace-nowrap tabular-nums">{label}</span>
          </div>
          {percent !== null && (
            <div className="h-1 overflow-hidden rounded-full bg-primary-9/10">
              <div
                className="h-full rounded-full bg-primary-6 transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The node files first, since nothing can be drawn before they land.
 *
 * Morphologies are counted rather than given a percentage. One OBI-One request
 * is in flight at a time, so there is a real stretch between the last node byte
 * and the first morphology: "0 of 12" reads as a queue that has not started
 * where "0%" reads as broken. It also spares a three-cell scene a bar that
 * moves a third at a time.
 */
function phase(
  download: DownloadProgress | null | undefined,
  morphologies: { loaded: number; total: number } | undefined
): { label: string; percent: number | null } {
  if (download) {
    const received = formatBytes(download.received, 0);
    // No Content-Length on one of the files: how far it has got is all there is
    // to say, and a bar would need a length to fill.
    if (!download.total) return { label: `Downloading nodes… ${received}`, percent: null };
    return {
      label: `Downloading nodes… ${received} of ${formatBytes(download.total, 0)}`,
      percent: Math.round((download.received / download.total) * 100),
    };
  }
  if (morphologies && morphologies.total > 0) {
    return {
      label: `Drawing morphologies… ${morphologies.loaded} of ${morphologies.total}`,
      percent: null,
    };
  }
  return { label: LOADING_LABEL, percent: null };
}
