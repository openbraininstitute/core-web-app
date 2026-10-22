'use client';

import { useEffect, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel, AssetStatus, type IAsset } from '@/api/entitycore/types/shared/global';
import { useLatest } from '@/ui/hooks/use-latest';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { logError } from '@/utils/logger';

import { fillSomas } from './load/cells';
import { loadCircuitMorphologies } from './load/load';

import type { WorkspaceContext } from '@/types/common';
import type { PackRequest } from './load/download';
import type { CircuitMorphologyData, Population } from './types';

/** A pack stored as the circuit's asset. */
export interface StoredPack {
  id: string;
  size: number;
  sha256: string | null;
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
  /** The pack stored as the circuit's asset, which the morphologies are read from. */
  stored: StoredPack;
}

export type MorphologiesLoad =
  | { status: 'idle' }
  /** `total` is the stored pack's size. */
  | { status: 'loading'; received: number; total: number }
  /** `coming`, while the rest of the pack comes in. */
  | { status: 'ready'; data: CircuitMorphologyData; coming?: { received: number; total: number } };

/**
 * Why a load stopped: it failed, with nothing to show; or the rest of the pack did not come in, what had shown kept
 * (`cut`).
 */
export type MorphologiesStop = { kind: 'failed' } | { kind: 'cut' };

const IDLE: MorphologiesLoad = { status: 'idle' };

/** The circuit's stored morphology pack, of its assets, if it has one. */
export function storedPackOf(assets: IAsset[] | undefined): StoredPack | null {
  const asset = assets?.find(
    ({ label, is_directory: directory, status }) =>
      label === AssetLabel.circuit_morphology_pack && !directory && status === AssetStatus.CREATED
  );
  return asset ? { id: asset.id, size: asset.size, sha256: asset.sha256_digest ?? null } : null;
}

async function packRequest(
  { stored, circuitId }: MorphologiesSource,
  ctx: WorkspaceContext | null
): Promise<PackRequest> {
  const request = await buildAssetDownloadRequest({
    ctx,
    entityType: EntityTypeDict.Circuit,
    entityId: circuitId,
    id: stored.id,
  });
  return { ...request, stored: { size: stored.size, sha256: stored.sha256 } };
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
      setStopped((was) => (was?.kind === 'cut' ? null : was));
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const setLoad = (load: MorphologiesLoad) => setCurrent({ source, load });
    let last = { received: 0, total: source.stored.size };
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
          setStopped({ kind: 'cut' });
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
  }, [source, workspace, told, attempt]);

  // A source that changed or went leaves its load behind for a render, which is not the next one's.
  const load = current?.source === source ? current.load : IDLE;
  return {
    load,
    stopped,
    dismiss: () => setStopped(null),
    retry: () => setAttempt((n) => n + 1),
  };
}
