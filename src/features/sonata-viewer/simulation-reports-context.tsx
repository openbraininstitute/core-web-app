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

export function useSimulationReport(assetFileName?: string): SimulationReport | null {
  const reports = useContext(SimulationReportsContext);
  if (!reports || !assetFileName) return null;
  const reportKey = assetFileName.replace(/\.h5$/, '');
  return reports[reportKey] ?? null;
}
