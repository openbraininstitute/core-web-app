import { createContext, useContext, useMemo } from 'react';

import type { ReactNode } from 'react';
import type {
  SweepSeriesRequest,
  SweepSeriesResponse,
  TraceIndex,
} from '@/features/ephys-viewer/trace-index';

type TraceContextValue = {
  /** Structure of the open file, so lookups don't have to cross the worker boundary. */
  index: TraceIndex;
  getSweepSeries: (req: SweepSeriesRequest) => Promise<SweepSeriesResponse>;
};

const TraceContext = createContext<TraceContextValue | null>(null);

export function TraceProvider({
  index,
  getSweepSeries,
  children,
}: TraceContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ index, getSweepSeries }), [index, getSweepSeries]);

  return <TraceContext.Provider value={value}>{children}</TraceContext.Provider>;
}

export function useTraceContext(): TraceContextValue {
  const context = useContext(TraceContext);

  if (!context) {
    throw new Error('useTraceContext must be used within a TraceProvider');
  }

  return context;
}
