'use client';

import { ViewerHelpRow, ViewerHelpTooltip } from './viewer-help-tooltip';

/** Top-left chrome help for electrode overlay gestures (MorphoViewer overlaysInteractive). */
export function ElectrodeInteractionHelp({ container }: { container?: HTMLElement | null }) {
  return (
    <ViewerHelpTooltip label="Electrode controls" title="Electrode controls" container={container}>
      <ul className="flex flex-col gap-2.5">
        <ViewerHelpRow label="Move" keys={['Left click', 'Drag']} />
        <ViewerHelpRow label="Rotate" keys={['⌥ Alt', 'Drag']} />
      </ul>
    </ViewerHelpTooltip>
  );
}
