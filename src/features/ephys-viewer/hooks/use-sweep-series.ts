import { useEffect, useState } from 'react';

import { useTraceContext } from '@/features/ephys-viewer/trace-context';

import type { SweepSeriesRequest, SweepSeriesResponse } from '@/features/ephys-viewer/trace-index';

export type SweepSeriesState = {
  data: SweepSeriesResponse | null;
  loading: boolean;
  error: Error | null;
};

const EMPTY_STATE: SweepSeriesState = { data: null, loading: false, error: null };

/**
 * Fetch a repetition's decimated sweeps from the worker.
 *
 * Pass `null` to hold off — the overview only asks for a repetition once it scrolls into
 * view. Requests are compared by value, so callers are free to build one inline.
 */
export function useSweepSeries(request: SweepSeriesRequest | null): SweepSeriesState {
  const { getSweepSeries } = useTraceContext();
  const [state, setState] = useState<SweepSeriesState>(EMPTY_STATE);

  // The serialised request is the effect's only trigger, so callers can build one inline
  // without it refetching on every render. The effect reads it back rather than closing over
  // `request`, which keeps the dependency list honest.
  const requestKey = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!requestKey) {
      setState(EMPTY_STATE);
      return;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    getSweepSeries(JSON.parse(requestKey) as SweepSeriesRequest)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, getSweepSeries]);

  return state;
}
