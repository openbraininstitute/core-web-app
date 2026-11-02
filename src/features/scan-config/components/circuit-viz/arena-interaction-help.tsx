'use client';

import { ViewerHelpRow, ViewerHelpTooltip } from './viewer-help-tooltip';

/** Top-left chrome help for the NeuroMechFly arena's handles. */
export function ArenaInteractionHelp() {
  return (
    <ViewerHelpTooltip label="Arena controls" title="Arena controls" width="w-72">
      <ul className="flex flex-col gap-2.5">
        <ViewerHelpRow label="Move an odour source" keys={['Drag', 'Amber pole']} />
        <ViewerHelpRow label="Move a wall end" keys={['Drag', 'Grey dot']} />
        <ViewerHelpRow label="Turn the fly" keys={['Drag', 'Green arrow']} />
        <ViewerHelpRow label="Set a body force" keys={['Drag', 'Red arrow tip']} />
        <ViewerHelpRow label="Zoom into its nervous system" keys={['Click', 'The fly']} />
      </ul>
    </ViewerHelpTooltip>
  );
}
