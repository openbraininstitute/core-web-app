'use client';

import { createContext, useContext, useMemo } from 'react';

import type { ReactNode } from 'react';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';
import type { SimulationRun } from '@/features/spike-viewer/time-window';

type SimulationContextValue = {
  model: TSupportedEntitiesForScanConfiguration | null;
  run: SimulationRun | null;
};

/**
 * What the campaign knows about the simulation a file came from, made available
 * to the viewers of its output files.
 *
 * A file viewer is handed an asset and the entity that owns it, which is enough
 * to draw a plot and nothing more. Replaying spikes over the circuit they came
 * from needs the circuit, and spanning an axis over the run needs its window —
 * neither of which is in the file, and both of which the campaign already
 * resolved. The same gap `SimulationReportsProvider` fills for report metadata.
 *
 * Every simulation in a campaign scans the same model, so that is one value for
 * the whole tab; the window is the active simulation's, since `tstop` can itself
 * be a scanned parameter.
 */
const SimulationContext = createContext<SimulationContextValue>({ model: null, run: null });

export function SimulationProvider({
  model,
  run,
  children,
}: {
  model: TSupportedEntitiesForScanConfiguration | null | undefined;
  run: SimulationRun | null | undefined;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ model: model ?? null, run: run ?? null }), [model, run]);

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  return useContext(SimulationContext);
}
