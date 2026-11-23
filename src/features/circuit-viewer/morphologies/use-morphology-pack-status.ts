'use client';

import { useQuery } from '@tanstack/react-query';

import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import {
  MorphologyPackNoPackReason,
  MorphologyPackState,
  type MorphologyPackStatus,
  requestMorphologyPack,
} from '@/api/small-scale-simulator/circuit/morphology-pack';
import { useWorkspace } from '@/ui/hooks/use-workspace';

const POLL_MS = 10_000;
const FAILED: MorphologyPackStatus = { state: MorphologyPackState.Failed };

/**
 * The circuit's morphology pack as Bluenaas has it, its build queued the first time it is asked for: `undefined` until
 * Bluenaas answers, `null` where it is not asked (no circuit, a single cell, no project). With `poll`, asked again
 * every 10 s while it builds.
 *
 * Gone once nothing reads it, so the next visit asks again: a pair or small circuit switches to its pack then, never
 * during the visit it was built in.
 */
export function useMorphologyPackStatus(
  circuit: Pick<ICircuit, 'id' | 'scale'> | undefined,
  { poll = false }: { poll?: boolean } = {}
): MorphologyPackStatus | null | undefined {
  const ctx = useWorkspace();
  const asked =
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
    refetchInterval: (query) =>
      poll && query.state.data?.state === MorphologyPackState.Building ? POLL_MS : false,
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
    case MorphologyPackState.Building:
      return 'Preparing morphologies, this takes a few minutes';
    case MorphologyPackState.Failed:
      return "Couldn't prepare morphologies";
    case MorphologyPackState.Refused:
      return status.reason === MorphologyPackNoPackReason.TooLarge
        ? 'Not available for a circuit this large'
        : 'No morphologies to show';
    default:
      return undefined;
  }
}
