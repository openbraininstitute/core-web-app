'use client';

/**
 * Workaround: provides simulation report metadata (variable names, units) from
 * the simulation config file to the sonata viewer.
 *
 * This should be removed once recording variable names are available directly
 * from the sonata report metadata (HDF5 file attributes).
 */

import { createContext, useContext } from 'react';

import type { ReactNode } from 'react';

export type SimulationReport = {
  variable_name: string;
  unit: string;
  type?: string;
  /** An extracellular report's electrodes file, which obi-one names by its recording array's id. */
  electrodes_file?: string;
};

type SimulationReportsContextValue = Record<string, SimulationReport> | null;

const SimulationReportsContext = createContext<SimulationReportsContextValue>(null);

export function SimulationReportsProvider({
  reports,
  children,
}: {
  reports: SimulationReportsContextValue;
  children: ReactNode;
}) {
  return (
    <SimulationReportsContext.Provider value={reports ?? null}>
      {children}
    </SimulationReportsContext.Provider>
  );
}

export function useSimulationReports(): SimulationReportsContextValue {
  return useContext(SimulationReportsContext);
}

export function useSimulationReport(assetFileName?: string): SimulationReport | null {
  const reports = useSimulationReports();
  if (!reports || !assetFileName) return null;
  const reportKey = assetFileName.replace(/\.h5$/, '');
  return reports[reportKey] ?? null;
}
