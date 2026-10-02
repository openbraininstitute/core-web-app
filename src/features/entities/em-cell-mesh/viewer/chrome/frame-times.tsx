import { fmt, ms } from '@/features/viewer-3d/chrome/debug-rows';

import { useViewStatus } from './use-view-status';

import type { EmMeshViewer, ViewStatus } from '../engine/em-mesh-viewer';

/** How a moving frame was drawn, in short. */
function movingParts(moving: NonNullable<ViewStatus['moving']>): string {
  return [
    moving.mesh === 'full' ? 'full mesh' : 'stand-in',
    moving.ao ? 'AO' : 'no AO',
    `${fmt(100 * moving.scale)}%`,
    moving.antialias ? 'AA' : 'no AA',
  ].join(' · ');
}

/**
 * What frames drawn while the view moves draw and cost, over the view: the Debug menu closes as soon as the view is
 * dragged.
 */
export function FrameTimes({ viewer }: { viewer: EmMeshViewer }) {
  const status = useViewStatus(viewer);
  if (!status) return null;
  return (
    <div
      data-testid="em-frame-times"
      className="pointer-events-none absolute top-3 right-3 rounded-md bg-black/60 px-2 py-1 font-mono text-[11px] leading-4 text-white tabular-nums"
    >
      <div>moving: {status.moving ? movingParts(status.moving) : 'none yet'}</div>
      <div>
        {ms(status.movingMs, 1)} GPU · {status.movingFps ?? '–'} fps
      </div>
      <div>
        full frame: {ms(status.frameMs, 1)}
        {status.slow ? ', slow' : ''}
      </div>
    </div>
  );
}
