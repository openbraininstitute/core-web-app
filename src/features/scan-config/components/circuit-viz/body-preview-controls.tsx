'use client';

import { RiPlayFill, RiRepeatLine, RiStopFill } from '@remixicon/react';

import { PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

export interface IBodyPreviewControls {
  /** Play every force and leg override on the episode's timeline; omitted when there are none. */
  all?: { playing: boolean; onToggle: () => void };
  /** The body block the form has open, played on repeat. */
  block?: { name: string; playing: boolean; onToggle: () => void };
  /** What the preview shows, while it plays. */
  readout?: string | null;
}

/** What the body did in the episode being replayed, beside the replay. */
export function BodyReplayNote({ readout }: { readout: string }) {
  return (
    <div
      role="note"
      data-testid="body-replay-note"
      className="max-w-xs rounded-lg bg-white/90 px-2.5 py-1.5 text-xs text-neutral-700 shadow-sm ring-1 ring-black/5"
    >
      {readout}
    </div>
  );
}

/** Plays what the experiment's forces and leg overrides do to the body, without physics. */
export function BodyPreviewControls({ all, block, readout }: IBodyPreviewControls) {
  const playing = Boolean(all?.playing || block?.playing);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        {all && (
          <button
            type="button"
            data-testid="body-preview-all"
            onClick={all.onToggle}
            className={cn(PILL_CLASS, 'gap-1.5')}
          >
            {all.playing ? <RiStopFill className="size-4" /> : <RiPlayFill className="size-4" />}
            {all.playing ? 'Stop' : 'Play all forces'}
          </button>
        )}
        {block && (
          <button
            type="button"
            data-testid="body-preview-block"
            onClick={block.onToggle}
            className={cn(PILL_CLASS, 'gap-1.5')}
          >
            {block.playing ? <RiStopFill className="size-4" /> : <RiRepeatLine className="size-4" />}
            {block.playing ? 'Stop' : `Play ${block.name}`}
          </button>
        )}
      </div>
      {playing && (
        <div
          role="note"
          data-testid="body-preview-warning"
          className="max-w-xs rounded-lg bg-amber-50/95 px-2.5 py-1.5 text-xs text-amber-900 shadow-sm ring-1 ring-amber-200"
        >
          {readout && <p className="mb-1 font-medium">{readout}</p>}
          <p>
            Previews don&apos;t use the physics engine of the simulation, so forces such as
            friction and gravity don&apos;t apply: a push carries the fly much further here than in
            the simulation.
          </p>
        </div>
      )}
    </div>
  );
}
