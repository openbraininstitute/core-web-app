import { RiCursorHand } from '@remixicon/react';

import { MorphologyLocationPickModeDict } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import { cn } from '@/utils/css-class';

import { isTargetableSectionType, sectionTypeLabel } from '../section-type-label';

import type { TMorphologyLocationPickModeDict } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import type { MorphoViewerMorphologyLocationHover } from '@/morpho-viewer';

/** Gap between the point and the popover, so the dot stays visible under it. */
const OFFSET_PX = 14;

/** What a click here would do. */
function clickPrompt(isPreview: boolean, pickMode: TMorphologyLocationPickModeDict): string {
  if (!isPreview) return 'Click again to remove';
  if (pickMode === MorphologyLocationPickModeDict.Create)
    return 'Add to new Explicit Morphology Locations';
  return 'Click to add a location';
}

/**
 * Labels the morphology location under the pointer with the values the config stores.
 *
 * `selected` is already in the list; `preview` is a spot a click would add. DOM rather than
 * canvas so it inherits app typography and stays sharp at any device-pixel ratio.
 */
export function MorphologyLocationPopover({
  hover,
  pickMode,
}: {
  hover: MorphoViewerMorphologyLocationHover | null;
  pickMode: TMorphologyLocationPickModeDict;
}) {
  if (!hover) return null;

  const isPreview = hover.kind === 'preview';
  const typeLabel = sectionTypeLabel(hover.sectionType);
  const showPrompt = !isPreview || isTargetableSectionType(hover.sectionType);
  const prompt = clickPrompt(isPreview, pickMode);

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
      <div className="rounded-md bg-neutral-8/95 px-3 py-2 text-white shadow-xl ring-1 ring-white/10">
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
        {showPrompt && (
          <p
            className={cn(
              'mt-1.5 flex max-w-48 items-start gap-1.5 border-t border-white/15 pt-1.5',
              'text-sm font-medium text-pretty',
              isPreview ? 'text-amber-200' : 'text-neutral-1'
            )}
          >
            <RiCursorHand className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{prompt}</span>
          </p>
        )}
      </div>
    </div>
  );
}
