'use client';

import { useEffect, useState } from 'react';

import { buildCircuitMorphologyPackRequest } from '@/api/one/circuit-visualization';
import { useLatest } from '@/ui/hooks/use-latest';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { logError } from '@/utils/logger';

import { fillSomas } from './load/cells';
import { loadCircuitMorphologies } from './load/load';

import type { Refused } from './load/download';
import type { CircuitMorphologyData, Population } from './types';

/** A circuit's cells as the page placed them. Memoise it: another one is another load. */
export interface MorphologiesSource {
  circuitId: string;
  /** In the page's order, which numbers the cells. */
  populations: Population[];
  /** Every cell's position, three floats each in the circuit's frame, for the cells the pack has no soma of. */
  positions: Float32Array;
  /** The radius of such a soma, µm. */
  somaRadius: number;
}

export type MorphologiesLoad =
  | { status: 'idle' }
  /** `total` is 0 until the pack's bytes come in: while OBI-One builds it, or reading it from the cache. */
  | { status: 'loading'; received: number; total: number }
  | { status: 'ready'; data: CircuitMorphologyData };

/** Why a load ended with nothing to show: OBI-One would not build the pack, or the load failed. */
export type MorphologiesStop = Refused | { kind: 'failed' };

const IDLE: MorphologiesLoad = { status: 'idle' };

/**
 * Loads the morphologies of `source`, whose boxes the view reads as it wants them, until `source` changes or goes and
 * they are let go of. A circuit OBI-One refuses and a load that fails both end idle, with `onStopped` called and
 * `stopped` saying why until it is dismissed or the next load starts.
 */
export function useCircuitMorphologies(
  source: MorphologiesSource | null,
  onStopped: () => void
): { load: MorphologiesLoad; stopped: MorphologiesStop | null; dismiss(): void } {
  const workspace = useWorkspace();
  const [current, setCurrent] = useState<{
    source: MorphologiesSource;
    load: MorphologiesLoad;
  } | null>(null);
  const [stopped, setStopped] = useState<MorphologiesStop | null>(null);
  const told = useLatest(onStopped);

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    const { signal } = controller;
    const setLoad = (load: MorphologiesLoad) => setCurrent({ source, load });
    setLoad({ status: 'loading', received: 0, total: 0 });
    setStopped(null);

    const stop = (why: MorphologiesStop) => {
      setCurrent(null);
      setStopped(why);
      told.current();
    };
    const run = async () => {
      const request = await buildCircuitMorphologyPackRequest(source.circuitId, workspace);
      const loaded = await loadCircuitMorphologies({
        request,
        populations: source.populations,
        signal,
        onProgress: (received, total) => {
          if (!signal.aborted) setLoad({ status: 'loading', received, total });
        },
      });
      if (signal.aborted) return;
      if (loaded.kind === 'refused') {
        stop(loaded);
        return;
      }
      fillSomas(loaded.data, source.positions, source.somaRadius);
      setLoad({ status: 'ready', data: loaded.data });
    };
    // Not in the effect itself: in development React runs it twice, and OBI-One goes on building for a request that
    // is gone while the next one waits behind it.
    const timer = setTimeout(() => {
      run().catch((e: unknown) => {
        if (signal.aborted) return;
        logError('Could not load the circuit morphologies', e);
        stop({ kind: 'failed' });
        // A pack loaded but not shown lets go of its worker.
        controller.abort();
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setCurrent(null);
    };
  }, [source, workspace, told]);

  // A source that changed or went leaves its load behind for a render, which is not the next one's.
  const load = current?.source === source ? current.load : IDLE;
  return { load, stopped, dismiss: () => setStopped(null) };
}
