'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { buildMorphologyPackDownloadRequest } from '@/api/small-scale-simulator/circuit/morphology-pack';
import { useLatest } from '@/ui/hooks/use-latest';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { logError } from '@/utils/logger';

import { fillSomas } from './load/cells';
import { loadCircuitMorphologies } from './load/load';

import type { WorkspaceContext } from '@/types/common';
import type { PackRequest } from './load/download';
import type { CircuitMorphologyData, Population } from './types';

/** A pack Bluenaas has ready: its size and digest, which name it in the cache. */
export interface PackFile {
  size: number;
  sha256: string;
}

/** A circuit's cells as the page placed them. Memoise it: another one is another load. */
export interface MorphologiesSource {
  circuitId: string;
  /** In the page's order, which numbers the cells. */
  populations: Population[];
  /** Every cell's position, three floats each in the circuit's frame, for the cells the pack has no soma of. */
  positions: Float32Array;
  /** The radius of such a soma, µm. */
  somaRadius: number;
  /** The circuit's pack in Bluenaas, which the morphologies are read from. */
  pack: PackFile;
}

export type MorphologiesLoad =
  | { status: 'idle' }
  /** `total` is the pack's size. */
  | { status: 'loading'; received: number; total: number }
  /** `coming`, while the rest of the pack comes in. */
  | { status: 'ready'; data: CircuitMorphologyData; coming?: { received: number; total: number } };

/**
 * Why a load stopped: it failed, with nothing to show; the rest of the pack did not come in, what had shown kept
 * (`cut`); or the pack that came in is not the one Bluenaas named, since it was built again (`changed`).
 */
export type MorphologiesStop = 'failed' | 'cut' | 'changed';

const IDLE: MorphologiesLoad = { status: 'idle' };

async function packRequest(
  { pack, circuitId }: MorphologiesSource,
  ctx: WorkspaceContext | null
): Promise<PackRequest> {
  const request = await buildMorphologyPackDownloadRequest({ ctx, circuitId });
  return { ...request, pack };
}

/**
 * Loads the morphologies of `source`, whose boxes the view reads as it wants them, until `source` changes or goes and
 * they are let go of: ready once the pack's somas are in, the rest still coming. A load that fails ends idle, with
 * `onStopped` called and `stopped` saying so until it is dismissed or the next load starts. Where the rest of the
 * pack does not come in, what is shown stays and `stopped` says so until `retry` loads it again or `source` goes.
 */
export function useCircuitMorphologies(
  source: MorphologiesSource | null,
  onStopped: () => void
): {
  load: MorphologiesLoad;
  stopped: MorphologiesStop | null;
  dismiss(): void;
  retry(): void;
} {
  const workspace = useWorkspace();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState<{
    source: MorphologiesSource;
    load: MorphologiesLoad;
  } | null>(null);
  const [stopped, setStopped] = useState<MorphologiesStop | null>(null);
  const [attempt, setAttempt] = useState(0);
  const told = useLatest(onStopped);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new attempt loads the same source again
  useEffect(() => {
    // The rest of a pack no longer shown is nothing to say.
    if (!source) {
      setStopped((was) => (was === 'failed' ? was : null));
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const setLoad = (load: MorphologiesLoad) => setCurrent({ source, load });
    let last = { received: 0, total: source.pack.size };
    setLoad({ status: 'loading', ...last });
    setStopped(null);

    const stop = (why: MorphologiesStop) => {
      setCurrent(null);
      setStopped(why);
      told.current();
    };
    let ready: CircuitMorphologyData | null = null;
    const show = (data: CircuitMorphologyData, coming: typeof last | null) =>
      setLoad(
        coming && coming.received < coming.total
          ? { status: 'ready', data, coming }
          : { status: 'ready', data }
      );
    const run = async () => {
      const request = await packRequest(source, workspace);
      const loaded = await loadCircuitMorphologies({
        request,
        populations: source.populations,
        freshHeaders: async () => (await packRequest(source, workspace)).headers,
        signal,
        onProgress: (received, total) => {
          if (signal.aborted) return;
          last = { received, total };
          if (ready) show(ready, last);
          else setLoad({ status: 'loading', received, total });
        },
      });
      if (signal.aborted) return;
      fillSomas(loaded.data, source.positions, source.somaRadius);
      const data = loaded.data;
      ready = data;
      show(data, loaded.fromCache ? null : last);
      loaded.whole
        .catch((e: unknown) => {
          if (signal.aborted) return;
          logError('Could not load the whole of the circuit morphologies', e);
          setStopped(e instanceof Error && e.name === 'PackChanged' ? 'changed' : 'cut');
        })
        .finally(() => {
          if (!signal.aborted) show(data, null);
        });
    };
    // Not in the effect itself: in development React runs it twice, and the first download would be started and
    // aborted for nothing.
    const timer = setTimeout(() => {
      run().catch((e: unknown) => {
        if (signal.aborted) return;
        logError('Could not load the circuit morphologies', e);
        stop('failed');
        // A pack loaded but not shown lets go of its worker.
        controller.abort();
      });
    }, 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
      setCurrent(null);
    };
  }, [source, workspace, told, attempt]);

  // A source that changed or went leaves its load behind for a render, which is not the next one's.
  const load = current?.source === source ? current.load : IDLE;
  return {
    load,
    stopped,
    dismiss: () => setStopped(null),
    // The status first: a pack built again since has another digest, and maybe another size.
    retry: () => {
      queryClient
        .invalidateQueries({ queryKey: ['circuit-morphology-pack', source?.circuitId] })
        .finally(() => setAttempt((n) => n + 1));
    },
  };
}
