'use client';

import { createContext, useContext, useMemo } from 'react';

import type { ReactNode } from 'react';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';
import type { SimulationCompartmentSets } from '@/features/sonata-viewer/compartment-sets';
import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { SimulationRun } from '@/features/spike-viewer/time-window';

/**
 * The neuron sets the campaign's config defines, as the simulation resolved
 * them: their names, and the simulation's node sets file, which holds each one
 * under its name - and whatever it references - beside the circuit's own.
 */
export type SimulationNeuronSets = {
  names: string[];
  nodeSets: Record<string, unknown>;
};

type SimulationContextValue = {
  model: TSupportedEntitiesForScanConfiguration | null;
  run: SimulationRun | null;
  neuronSets: SimulationNeuronSets | null;
  /** The locations its compartment reports record, by set, each beside the block it came from. */
  compartmentSets: SimulationCompartmentSets | null;
  /** Picks which of the campaign's simulations is on show, for a viewer's header. */
  simulationPicker: ReactNode;
  /** When the simulation's stimuli, recordings and synaptic changes happen, from its config. */
  timeline: readonly TimelineEvent[];
};

const NO_TIMELINE: readonly TimelineEvent[] = [];

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
const SimulationContext = createContext<SimulationContextValue>({
  model: null,
  run: null,
  neuronSets: null,
  compartmentSets: null,
  simulationPicker: null,
  timeline: NO_TIMELINE,
});

export function SimulationProvider({
  model,
  run,
  neuronSets,
  compartmentSets,
  simulationPicker = null,
  timeline = NO_TIMELINE,
  children,
}: {
  model: TSupportedEntitiesForScanConfiguration | null | undefined;
  run: SimulationRun | null | undefined;
  neuronSets?: SimulationNeuronSets | null;
  compartmentSets?: SimulationCompartmentSets | null;
  simulationPicker?: ReactNode;
  timeline?: readonly TimelineEvent[];
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      model: model ?? null,
      run: run ?? null,
      neuronSets: neuronSets ?? null,
      compartmentSets: compartmentSets ?? null,
      simulationPicker,
      timeline,
    }),
    [model, run, neuronSets, compartmentSets, simulationPicker, timeline]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  return useContext(SimulationContext);
}
