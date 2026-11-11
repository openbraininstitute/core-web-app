import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePlotRevision } from '@/features/ephys-viewer/hooks/use-plot-revision';

describe('usePlotRevision', () => {
  it('holds still while its inputs do', () => {
    const traces = [{ y: [1, 2, 3] }];

    const { result, rerender } = renderHook(({ data }) => usePlotRevision(data, 0), {
      initialProps: { data: traces },
    });

    const first = result.current;
    rerender({ data: traces });

    expect(result.current).toBe(first);
  });

  it('moves when the traces are rebuilt', () => {
    const { result, rerender } = renderHook(({ data }) => usePlotRevision(data, 0), {
      initialProps: { data: [{ y: [1, 2, 3] }] },
    });

    const first = result.current;
    // What a unit switch does: same points, converted, in a freshly allocated array.
    rerender({ data: [{ y: [1000, 2000, 3000] }] });
    expect(result.current).not.toBe(first);

    const second = result.current;
    rerender({ data: [{ y: [1, 2, 3] }] });
    expect(result.current).not.toBe(second);
  });

  it('moves when the plot is asked to lay out again', () => {
    const traces = [{ y: [1, 2, 3] }];

    const { result, rerender } = renderHook(({ revision }) => usePlotRevision(traces, revision), {
      initialProps: { revision: 0 },
    });

    const first = result.current;
    rerender({ revision: 1 });

    expect(result.current).not.toBe(first);
  });
});
