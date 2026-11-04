import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS,
  DEFAULT_SPIKE_GLOW,
  DEFAULT_SPIKE_SPEED,
} from '@/features/circuit-viewer/spike-clock';
import { createTimeCursor } from '@/features/sonata-viewer/time-cursor';
import { useSceneTime } from '@/features/spike-viewer/components/scene-time';

/** How often the readout and scrubber catch up with the viewer's clock. */
const READOUT_INTERVAL_IN_MS = 100;

/**
 * The replay's clock. The viewer owns it and reports it on every painted
 * frame, straight into the raster's imperative renderer; React only samples
 * it for the readout, ten times a second rather than sixty.
 *
 * It plays `playFrom` to `playTo`, a raster zoomed to a span of time playing
 * that span: it stops at its end, and play from outside it, or at its end,
 * starts again from its start.
 */
export function useReplayClock({
  timeRange,
  playFrom,
  playTo,
}: {
  timeRange: { min: number; max: number };
  playFrom: number;
  playTo: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPIKE_SPEED);
  const [afterglowInSeconds, setAfterglowInSeconds] = useState(DEFAULT_SPIKE_AFTERGLOW_IN_SECONDS);
  const [glow, setGlow] = useState(DEFAULT_SPIKE_GLOW);
  const [seekToMs, setSeekToMs] = useState<number | undefined>();
  // False until the viewer has painted a frame. It arrives on a dynamic
  // chunk, so for a while there is no child to receive anything.
  const [sceneLive, setSceneLive] = useState(false);
  const [readoutTimeInMs, setReadoutTimeInMs] = useState(timeRange.min);

  const playheadRef = useRef<((timeInMs: number | null) => void) | null>(null);
  const liveTimeRef = useRef(timeRange.min);
  // The scrubber under the raster's axis, moved like the playhead: every frame.
  const scrubberRef = useRef<((timeInMs: number) => void) | null>(null);

  const playEndRef = useRef(playTo);
  useEffect(() => {
    playEndRef.current = playTo;
  });
  // The time over the 3D view, moved on the DOM with the playhead, and pushed to
  // the PSTHs, which mark it too.
  const sceneTime = useSceneTime(liveTimeRef);
  const showSceneTime = sceneTime.show;
  const playheadCursor = useMemo(() => createTimeCursor(), []);
  const handleTimeChange = useCallback(
    (timeInMs: number) => {
      liveTimeRef.current = timeInMs;
      playheadRef.current?.(timeInMs);
      scrubberRef.current?.(timeInMs);
      showSceneTime(timeInMs);
      playheadCursor.set(timeInMs);
      setSceneLive(true);
      if (timeInMs >= playEndRef.current) setPlaying(false);
    },
    [showSceneTime, playheadCursor]
  );

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(
      () => setReadoutTimeInMs(liveTimeRef.current),
      READOUT_INTERVAL_IN_MS
    );
    // Cleanup settles on the exact frame playback stopped at, which the sampler
    // will have missed by up to its own interval.
    return () => {
      window.clearInterval(interval);
      setReadoutTimeInMs(liveTimeRef.current);
    };
  }, [playing]);

  // Clamped because the raster pads its initial view either side of the data,
  // so a click well inside the plot area can name a time the recording never
  // reached - which the transport would print and the 3D viewer, clamping
  // internally, would refuse to follow.
  const { min: timeMinInMs, max: timeMaxInMs } = timeRange;
  const handleSeek = useCallback(
    (rawTimeInMs: number) => {
      const timeInMs = Math.min(timeMaxInMs, Math.max(timeMinInMs, rawTimeInMs));
      setSeekToMs(timeInMs);
      setReadoutTimeInMs(timeInMs);
      liveTimeRef.current = timeInMs;
      playheadRef.current?.(timeInMs);
      scrubberRef.current?.(timeInMs);
      showSceneTime(timeInMs);
      playheadCursor.set(timeInMs);
    },
    [timeMinInMs, timeMaxInMs, showSceneTime, playheadCursor]
  );

  // One-shot, so that seeking twice to the same millisecond still seeks: held,
  // the second Restart during playback would be no state change, hence no
  // re-seek, and the button would go dead. "Children's effects run first"
  // only covers a child that exists — until the viewer's chunk has loaded and
  // reported a frame, clearing here would throw the seek away and play would
  // start from `timeMin`.
  useEffect(() => {
    if (seekToMs === undefined || !sceneLive) return;
    setSeekToMs(undefined);
  }, [seekToMs, sceneLive]);

  // Played from the span's start when outside it, from the transport or the scene's corner.
  const handlePlayingChange = (next: boolean) => {
    const at = liveTimeRef.current;
    if (next && (at < playFrom || at >= playTo)) handleSeek(playFrom);
    setPlaying(next);
  };

  return {
    playing,
    setPlaying,
    handlePlayingChange,
    speed,
    setSpeed,
    afterglowInSeconds,
    setAfterglowInSeconds,
    glow,
    setGlow,
    seekToMs,
    readoutTimeInMs,
    liveTimeRef,
    playheadRef,
    scrubberRef,
    sceneTime,
    playheadCursor,
    handleTimeChange,
    handleSeek,
  };
}
