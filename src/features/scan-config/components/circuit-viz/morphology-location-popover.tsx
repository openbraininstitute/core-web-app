import { cn } from '@/utils/css-class';

import { sectionTypeLabel } from './section-type-label';

import type { MorphoViewerMorphologyLocationHover } from '@/morpho-viewer';

/** Gap between the point and the popover, so the dot stays visible under it. */
const OFFSET_PX = 14;

/**
 * Labels the morphology location under the pointer with the values the config stores.
 *
 * `selected` is already in the list; `preview` is a spot a click would add. DOM rather than
 * canvas so it inherits app typography and stays sharp at any device-pixel ratio.
 */
export function MorphologyLocationPopover({
  hover,
}: {
  hover: MorphoViewerMorphologyLocationHover | null;
}) {
  if (!hover) return null;

  const isPreview = hover.kind === 'preview';
  const typeLabel = sectionTypeLabel(hover.sectionType);

  // Flip to the other side near an edge so the popover is never clipped by the canvas.
  const flipX = hover.screen.x > 0.65;
  const flipY = hover.screen.y < 0.2;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-10"
      style={{
        left: `${hover.screen.x * 100}%`,
        top: `${hover.screen.y * 100}%`,
        transform: `translate(${flipX ? `calc(-100% - ${OFFSET_PX}px)` : `${OFFSET_PX}px`}, ${
          flipY ? `${OFFSET_PX}px` : `calc(-100% - ${OFFSET_PX}px)`
        })`,
      }}
    >
      <div className="rounded-md bg-neutral-8/90 px-2.5 py-1.5 text-white shadow-lg">
        <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 whitespace-nowrap text-xs">
          {typeLabel && (
            <>
              <dt className="text-neutral-3">Type</dt>
              <dd className="text-right font-medium">{typeLabel}</dd>
            </>
          )}
          <dt className="text-neutral-3">Section</dt>
          <dd className="text-right font-medium tabular-nums">{hover.sonataSectionId ?? '—'}</dd>
          <dt className="text-neutral-3">Offset</dt>
          <dd className="text-right font-medium tabular-nums">{hover.offset.toFixed(3)}</dd>
        </dl>
        <p
          className={cn(
            'mt-1 border-t border-white/15 pt-1 text-[10px]',
            isPreview ? 'text-amber-200' : 'text-neutral-3'
          )}
        >
          {isPreview ? 'Click to add this location' : 'Click again to remove'}
        </p>
      </div>
    </div>
  );
}
