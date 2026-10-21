'use client';

import { useEffect, useState } from 'react';

import { buildAssetDownloadRequest } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel, AssetStatus, type IAsset } from '@/api/entitycore/types/shared/global';
import { buildCircuitMorphologyPackRequest } from '@/api/one/circuit-visualization';
import { useLatest } from '@/ui/hooks/use-latest';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { logError } from '@/utils/logger';

import { fillSomas } from './load/cells';
import { loadCircuitMorphologies } from './load/load';

import type { WorkspaceContext } from '@/types/common';
import type { PackRequest, Refused } from './load/download';
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
  /** The circuit's stored pack, read in place of the one OBI-One builds; none, and OBI-One builds it. */
  stored?: StoredPack | null;
}

export type MorphologiesLoad =
  | { status: 'idle' }
  /** `total` is 0 until the pack's bytes come in: while OBI-One builds it, or reading it from the cache. */
  | { status: 'loading'; received: number; total: number }
  /** `coming`, while the rest of the pack comes in. */
  | { status: 'ready'; data: CircuitMorphologyData; coming?: { received: number; total: number } };

/** Why a load ended with nothing to show: OBI-One would not build the pack, or the load failed. */
export type MorphologiesStop = Refused | { kind: 'failed' };

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
  source: MorphologiesSource,
  ctx: WorkspaceContext | null
): Promise<PackRequest> {
  const { stored, circuitId } = source;
  if (!stored) return buildCircuitMorphologyPackRequest(circuitId, ctx);
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
 * they are let go of: ready once the pack's somas are in, the rest still coming. A circuit OBI-One refuses and a load
 * that fails both end idle, with `onStopped` called and `stopped` saying why until it is dismissed or the next load
 * starts.
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
    let ready: CircuitMorphologyData | null = null;
    let last = { received: 0, total: 0 };
    // Where the server says no total, the rest is coming until the whole is in.
    const show = (data: CircuitMorphologyData, coming: typeof last | null) =>
      setLoad(
        coming && (coming.total === 0 || coming.received < coming.total)
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
      if (loaded.kind === 'refused') {
        stop(loaded);
        return;
      }
      fillSomas(loaded.data, source.positions, source.somaRadius);
      const data = loaded.data;
      ready = data;
      show(data, loaded.fromCache ? null : last);
      loaded.whole
        .catch((e: unknown) => {
          if (!signal.aborted) logError('Could not load the whole of the circuit morphologies', e);
        })
        .finally(() => {
          if (!signal.aborted) show(data, null);
        });
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
