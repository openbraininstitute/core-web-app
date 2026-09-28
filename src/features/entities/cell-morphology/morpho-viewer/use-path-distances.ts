'use client';

import { useEffect, useRef, useState } from 'react';

import { logError } from '@/utils/logger';

import { errorMessage } from './engine/protocol';

import type { DistanceData } from './engine/colors';
import type { MeshPool } from './engine/pool';
import type { DistanceRequest } from './engine/protocol';
import type { Layers } from './use-morphology-mesh';

export interface PathDistancesState {
  distances: DistanceData | null;
  /** Why the last measurement failed; choosing Distance again tries once more. */
  error: string | null;
}

/**
 * The path distances of the layers on show, while `enabled`. The workers measure each layer once, the first time it
 * is coloured by distance; until they have, it keeps its section colours. The distances go by the layer object they
 * were measured for, so that a late answer cannot colour what came after it.
 */
export function usePathDistances(
  pool: MeshPool | null,
  { original, processed, mesh }: Layers,
  enabled: boolean
): PathDistancesState {
  const [measured] = useState(() => new WeakMap<object, Float32Array>());
  const [pending] = useState(() => new WeakSet<object>());
  // A new value whenever a measurement comes in, for the viewer to paint it.
  const [arrived, setArrived] = useState<{ original: object; data: DistanceData } | null>(null);
  const [failed, setFailed] = useState<{ original: object; message: string } | null>(null);
  const current = useRef<object | null>(null);

  useEffect(() => {
    current.current = original;
    if (!pool || !enabled || !original) return;
    const wanted = <T extends object>(layer: T | null): layer is T =>
      layer !== null && !measured.has(layer) && !pending.has(layer);
    const request: DistanceRequest = {
      original: wanted(original) ? original : undefined,
      processed: wanted(processed) ? processed : undefined,
      mesh: wanted(mesh) ? { positions: mesh.positions, types: mesh.vertexTypes } : undefined,
    };
    const asked = [original, processed, mesh].filter(wanted);
    if (asked.length === 0) return;
    for (const layer of asked) pending.add(layer);
    setFailed(null);
    pool
      .distances(request)
      .then(
        (reply) => {
          if (reply.original) measured.set(original, reply.original);
          if (processed && reply.processed) measured.set(processed, reply.processed);
          if (mesh && reply.mesh) measured.set(mesh, reply.mesh);
          if (current.current !== original) return;
          setArrived({ original, data: { max: reply.max, of: (layer) => measured.get(layer) } });
        },
        (e) => {
          if (pool.isDisposed) return;
          logError('Could not measure the path distances', e);
          if (current.current === original) setFailed({ original, message: errorMessage(e) });
        }
      )
      .finally(() => {
        for (const layer of asked) pending.delete(layer);
      });
  }, [pool, enabled, original, processed, mesh, measured, pending]);

  const on = enabled && original !== null;
  return {
    distances: on && arrived?.original === original ? arrived.data : null,
    error: on && failed?.original === original ? failed.message : null,
  };
}
