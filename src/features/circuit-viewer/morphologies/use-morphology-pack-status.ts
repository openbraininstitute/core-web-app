'use client';

import { useQuery } from '@tanstack/react-query';

import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import {
  type MorphologyPackStatus,
  requestMorphologyPack,
} from '@/api/small-scale-simulator/circuit/morphology-pack';
import { circuitMorphologiesFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';

const POLL_MS = 10_000;
const FAILED: MorphologyPackStatus = { state: 'failed' };

/**
 * The circuit's morphology pack as Bluenaas has it, its build queued the first time it is asked for: `undefined` until
 * Bluenaas answers, `null` where it is not asked (no circuit, a single cell, the `circuit-morphologies` flag off, no
 * project). With `poll`, asked again every 10 s while it builds.
 *
 * Gone once nothing reads it, so the next visit asks again: a pair or small circuit switches to its pack then, never
 * during the visit it was built in.
 */
export function useMorphologyPackStatus(
  circuit: Pick<ICircuit, 'id' | 'scale'> | undefined,
  { poll = false }: { poll?: boolean } = {}
): MorphologyPackStatus | null | undefined {
  const flag = !!useFlag(circuitMorphologiesFlag.key);
  const ctx = useWorkspace();
  const asked =
    flag &&
    circuit !== undefined &&
    circuit.scale !== CircuitScaleDictionary.Single &&
    !!ctx.virtualLabId &&
    !!ctx.projectId;
  const { data, isError } = useQuery({
    queryKey: ['circuit-morphology-pack', circuit?.id, ctx.virtualLabId, ctx.projectId],
    queryFn: ({ signal }) =>
      requestMorphologyPack({ ctx, circuitId: (circuit as ICircuit).id, signal }),
    enabled: asked,
    gcTime: 0,
    // Hosts that mount together share one request.
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: (query) => (poll && query.state.data?.state === 'building' ? POLL_MS : false),
  });
  if (!asked) return null;
  if (isError) return FAILED;
  return data;
}

/** Why a circuit drawn as somas cannot be switched to its morphologies, where it has no pack ready. */
export function morphologyPackNote(
  status: MorphologyPackStatus | null | undefined
): string | undefined {
  switch (status?.state) {
    case 'building':
      return 'Preparing morphologies, this takes a few minutes';
    case 'failed':
      return "Couldn't prepare morphologies";
    case 'refused':
      return status.reason === 'too_large'
        ? 'Not available for a circuit this large'
        : 'No morphologies to show';
    default:
      return undefined;
  }
}
