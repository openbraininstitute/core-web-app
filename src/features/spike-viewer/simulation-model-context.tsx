'use client';

import { createContext, useContext } from 'react';

import type { ReactNode } from 'react';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

/**
 * The model a simulation scanned, made available to the viewers of its output
 * files.
 *
 * A file viewer is handed an asset and the entity that owns it, which is enough
 * to draw a plot and nothing more. Replaying spikes over the circuit they came
 * from needs the circuit, and only the campaign knows which one that is — the
 * same gap {@link SimulationReportsProvider} fills for report metadata.
 *
 * Every simulation in a campaign scans the same model, so this is one value for
 * the whole tab rather than one per file.
 */
const SimulationModelContext = createContext<TSupportedEntitiesForScanConfiguration | null>(null);

export function SimulationModelProvider({
  model,
  children,
}: {
  model: TSupportedEntitiesForScanConfiguration | null | undefined;
  children: ReactNode;
}) {
  return (
    <SimulationModelContext.Provider value={model ?? null}>
      {children}
    </SimulationModelContext.Provider>
  );
}

export function useSimulationModel(): TSupportedEntitiesForScanConfiguration | null {
  return useContext(SimulationModelContext);
}
