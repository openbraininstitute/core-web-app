import { act, renderHook } from '@testing-library/react';
import { atom, createStore, Provider } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedCallback, useEnsuredPath, useLastTruthyValue, usePrevious } from './hooks';

import type { ReactNode } from 'react';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Import after vi.mock so the mocked module is used.
import { usePathname } from 'next/navigation';

const mockedPathname = vi.mocked(usePathname);

describe('usePrevious', () => {
  it('returns undefined on the first render', () => {
    const { result } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'a' },
    });
    expect(result.current).toBeUndefined();
  });

  it('returns the prior value after a re-render with a new value', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    rerender({ value: 'c' });
    expect(result.current).toBe('b');
  });
});

describe('useLastTruthyValue', () => {
  function makeWrapper(store: ReturnType<typeof createStore>) {
    return function Wrapper({ children }: { children: ReactNode }) {
      return <Provider store={store}>{children}</Provider>;
    };
  }

  it('returns the initial truthy value from the atom', () => {
    const store = createStore();
    const a = atom<string | null>('first');

    const { result } = renderHook(() => useLastTruthyValue(a), {
      wrapper: makeWrapper(store),
    });

    expect(result.current).toBe('first');
  });

  it('updates when the atom transitions to another truthy value', () => {
    const store = createStore();
    const a = atom<string | null>('first');

    const { result } = renderHook(() => useLastTruthyValue(a), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      store.set(a, 'second');
    });

    expect(result.current).toBe('second');
  });

  it('keeps the last truthy value when the atom becomes falsy', () => {
    const store = createStore();
    const a = atom<string | null>('first');

    const { result } = renderHook(() => useLastTruthyValue(a), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      store.set(a, 'second');
    });
    act(() => {
      store.set(a, null);
    });

    expect(result.current).toBe('second');
  });
});

describe('useEnsuredPath', () => {
  beforeEach(() => {
    mockedPathname.mockReset();
  });

  it('returns the pathname when usePathname provides one', () => {
    mockedPathname.mockReturnValue('/foo');

    const { result } = renderHook(() => useEnsuredPath());

    expect(result.current).toBe('/foo');
  });

  it('throws when usePathname returns null', () => {
    mockedPathname.mockReturnValue(null as unknown as string);

    expect(() => renderHook(() => useEnsuredPath())).toThrow('Invalid pathname');
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not invoke the callback synchronously', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, [], 200));

    act(() => {
      result.current('payload');
    });

    expect(fn).not.toHaveBeenCalled();
  });

  it('invokes the callback exactly once after the wait elapses', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, [], 200));

    act(() => {
      result.current('payload');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('payload');
  });
});
