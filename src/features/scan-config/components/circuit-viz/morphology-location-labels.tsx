import { sectionTypeLabel } from './section-type-label';

import type { MorphoViewerMorphologyLocationLabel } from '@/morpho-viewer';

/**
 * Persistent `Type[section]` tags pinned to each selected location.
 *
 * Unlike the hover popover, these show the whole selection at once. Positions arrive on every
 * repaint, so tags follow their points as the camera orbits.
 */
export function MorphologyLocationLabels({
  labels,
}: {
  labels: MorphoViewerMorphologyLocationLabel[];
}) {
  if (labels.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {labels.map(({ marker, screen, visible }, index) =>
        visible ? (
          <span
            // Positional: two locations may share a section and offset; order is stable.
            // biome-ignore lint/suspicious/noArrayIndexKey: positional by design
            key={index}
            className="absolute -translate-y-1/2 translate-x-2 whitespace-nowrap rounded bg-neutral-8/80 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums"
            style={{ left: `${screen.x * 100}%`, top: `${screen.y * 100}%` }}
          >
            {sectionTypeLabel(marker.sectionType) ?? 'Section'}[{marker.sonataSectionId ?? '—'}]
          </span>
        ) : null
      )}
    </div>
  );
}
