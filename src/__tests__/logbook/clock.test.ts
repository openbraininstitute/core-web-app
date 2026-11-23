import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useNow } from '@/features/logbook/helpers';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('a paused clock (a hidden page) never ticks; it ticks again once shown', () => {
  const { result, rerender } = renderHook(({ on }) => useNow(400, on), {
    initialProps: { on: false },
  });
  const start = result.current;
  act(() => vi.advanceTimersByTime(4000));
  expect(result.current).toBe(start);
  rerender({ on: true });
  act(() => vi.advanceTimersByTime(400));
  expect(result.current).toBeGreaterThan(start);
});
