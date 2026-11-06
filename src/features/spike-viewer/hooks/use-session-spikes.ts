'use client';

import { useEffect, useState } from 'react';

import type { CircuitSpikes } from '@/features/circuit-viewer/types';
import type { SpikeSession } from '@/features/spike-viewer/hooks/use-spike-session';
import type { KeptSpikes } from '@/features/spike-viewer/spike-store';

/**
 * The spikes of `name`'s cells that `cells` flags, cut by the file's worker;
 * null where `cells` is, as there is nothing to cut. The last cut of the same
 * file and population stands while the next is worked out, so a view goes
 * from one straight to the next; before the first, null.
 */
export function useKeptSpikes(
  session: SpikeSession | null,
  name: string | undefined,
  cells: Uint8Array | null
): KeptSpikes | null {
  const [cut, setCut] = useState<{ session: SpikeSession; name: string; spikes: KeptSpikes }>();
  useEffect(() => {
    if (!session || !name || !cells) return;
    let cancelled = false;
    session
      .kept(name, cells, null)
      .then((spikes) => {
        if (!cancelled) setCut({ session, name, spikes });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, name, cells]);
  if (!cells) return null;
  return cut?.session === session && cut.name === name ? cut.spikes : null;
}

/**
 * What the 3D replay plays for `name`: its spikes, cut to `cells` where they
 * are given, worked out by the file's worker. The last of the same file and
 * population stands while the next is worked out; null before the first, and
 * with no `name`.
 */
export function useViewerSpikes(
  session: SpikeSession | null,
  name: string | undefined,
  cells: Uint8Array | undefined,
  { min, max }: { min: number; max: number }
): CircuitSpikes | null {
  const [replay, setReplay] = useState<{
    session: SpikeSession;
    name: string;
    spikes: CircuitSpikes | null;
  }>();
  useEffect(() => {
    if (!session || !name) return;
    let cancelled = false;
    session
      .viewer(name, cells ?? null, null, { min, max })
      .then((spikes) => {
        if (!cancelled) setReplay({ session, name, spikes });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, name, cells, min, max]);
  if (!name) return null;
  return replay?.session === session && replay.name === name ? replay.spikes : null;
}
