import { useEffect, useState } from 'react';

import { useTraceContext } from '@/features/ephys-viewer/trace-context';

import type { SweepSeriesRequest, SweepSeriesResponse } from '@/features/ephys-viewer/trace-index';

export type SweepSeriesState = {
  data: SweepSeriesResponse | null;
  loading: boolean;
  error: Error | null;
};

const EMPTY_STATE: SweepSeriesState = { data: null, loading: false, error: null };

const settled = (data: SweepSeriesResponse): SweepSeriesState => ({
  data,
  loading: false,
  error: null,
});

/**
 * Fetch a repetition's decimated sweeps from the worker.
 *
 * Pass `null` to hold off — the overview only asks for a repetition once it scrolls into
 * view. Requests are compared by value, so callers are free to build one inline.
 *
 * A request the session has already answered resolves out of its cache without ever reporting
 * `loading`, so returning to a view it has drawn before costs no spinner.
 */
export function useSweepSeries(request: SweepSeriesRequest | null): SweepSeriesState {
  const { getSweepSeries, getCachedSweepSeries } = useTraceContext();

  // Seeded rather than assigned in the effect: the effect only runs after a paint, which is
  // long enough for a loading state to show.
  const [state, setState] = useState<SweepSeriesState>(() => {
    const cached = request && getCachedSweepSeries(request);
    return cached ? settled(cached) : EMPTY_STATE;
  });

  // The serialised request is the effect's only trigger, so callers can build one inline
  // without it refetching on every render. The effect reads it back rather than closing over
  // `request`, which keeps the dependency list honest.
  const requestKey = request ? JSON.stringify(request) : null;

  useEffect(() => {
    if (!requestKey) {
      setState(EMPTY_STATE);
      return;
    }

    const parsed = JSON.parse(requestKey) as SweepSeriesRequest;

    const cached = getCachedSweepSeries(parsed);
    if (cached) {
      setState((previous) =>
        previous.data === cached && !previous.loading ? previous : settled(cached)
      );
      return;
    }

    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    getSweepSeries(parsed)
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
  }, [requestKey, getSweepSeries, getCachedSweepSeries]);

  return state;
}
