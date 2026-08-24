import type { MorphoViewerSpikes } from '@/morpho-viewer';

/**
 * A spike replay and the controls driving it.
 *
 * The viewer owns the clock: it advances simulated time on every painted frame
 * and reports where it got to through {@link ISpikeReplayBinding.onTimeChange}.
 * `timeInMs` is therefore a seek, not a mirror — feeding the reported time
 * straight back would fight the animation.
 *
 * Lives here rather than in `circuit-scene.tsx` so the viz surfaces under
 * `scan-config` can name the type without importing a module that imports
 * them back.
 */
export interface ISpikeReplayBinding {
  data?: MorphoViewerSpikes;
  /** Move the playhead here. Only read when it changes. */
  timeInMs?: number;
  /** The playhead on every painted frame. Throttle before putting it in state. */
  onTimeChange?(timeInMs: number): void;
  playing?: boolean;
  /** Also fires with `false` when playback reaches the end of the recording. */
  onPlayingChange?(playing: boolean): void;
  /** Simulated milliseconds per wall-clock second. */
  speed?: number;
  /** Wall-clock seconds for a spike to fade to `1/e` of full brightness. */
  afterglowInSeconds?: number;
}
