import { atom, useAtomValue } from 'jotai';

import { connectivityAsset } from '@/features/circuit-nodes/connectivity/use-connectivity';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ViewMode } from '@/features/circuit-nodes/types';

/**
 * What a report's table shows, kept with its circuit: the next report or simulation over the
 * same cells stays on it, as their ticks and filters do.
 */
export const reportTableViewAtom = atom<{ circuitId: string; view: ViewMode } | undefined>(
  undefined
);

/** What a report's table over `circuit` shows, for the table and for the pane it is in. */
export function useReportTableView(circuit: ICircuit | undefined): ViewMode {
  const stored = useAtomValue(reportTableViewAtom);
  return circuit && connectivityAsset(circuit) && stored?.circuitId === circuit.id
    ? stored.view
    : 'nodes';
}
