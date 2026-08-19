'use client';

import { ViewerHelpRow, ViewerHelpTooltip } from './viewer-help-tooltip';

/** Top-left chrome help for picking morphology locations. */
export function MorphologyLocationHelp({ container }: { container?: HTMLElement | null }) {
  return (
    <ViewerHelpTooltip
      label="Morphology location controls"
      title="Morphology locations"
      container={container}
      width="w-72"
    >
      <p className="mb-2.5 text-xs leading-relaxed text-neutral-700">
        Click anywhere on the neuron to add a location. Hover first to see which branch and how far
        along it you are — the pointer turns into a hand wherever a click will land.
      </p>
      <ul className="flex flex-col gap-2.5">
        <ViewerHelpRow label="Add a location" keys={['Left click']} />
        <ViewerHelpRow label="Remove one" keys={['Left click']} />
        <ViewerHelpRow label="Preview a spot" keys={['Hover']} />
      </ul>
      <p className="mt-2.5 border-t border-neutral-200 pt-2.5 text-[11px] leading-relaxed text-neutral-500">
        Added locations appear as markers, and in the list on the left where you can edit or remove
        them.
      </p>
    </ViewerHelpTooltip>
  );
}
