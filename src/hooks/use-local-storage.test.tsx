import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorage } from './use-local-storage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('seeds storage with the stringified initial value on mount', async () => {
    const key = 'seed-key';
    const initial = { hello: 'world' };

    const { result } = renderHook(() => useLocalStorage(key, initial));

    await waitFor(() => {
      expect(window.localStorage.getItem(key)).toBe(JSON.stringify(initial));
    });
    expect(result.current[0]).toEqual(initial);
  });

  it('reads an existing value from storage without overwriting it', async () => {
    const key = 'existing-key';
    const existing = { foo: 1 };
    window.localStorage.setItem(key, JSON.stringify(existing));

    const { result } = renderHook(() => useLocalStorage(key, { foo: 99 }));

    expect(result.current[0]).toEqual(existing);
    // The hook should not overwrite an existing entry even after effects run.
    await waitFor(() => {
      expect(window.localStorage.getItem(key)).toBe(JSON.stringify(existing));
    });
  });

  it('persists a value passed directly to setState', async () => {
    const key = 'set-direct';
    const { result } = renderHook(() => useLocalStorage<string>(key, 'initial'));

    act(() => {
      result.current[1]('new value');
    });

    await waitFor(() => expect(result.current[0]).toBe('new value'));
    expect(window.localStorage.getItem(key)).toBe(JSON.stringify('new value'));
  });

  it('passes the parsed previous value into a functional setState updater', async () => {
    const key = 'set-fn';
    const { result } = renderHook(() => useLocalStorage(key, { count: 1 }));

    // Wait for the seeding effect so the snapshot reflects the persisted value.
    await waitFor(() => {
      expect(window.localStorage.getItem(key)).toBe(JSON.stringify({ count: 1 }));
    });

    act(() => {
      result.current[1]((prev) => ({ count: prev.count + 1 }));
    });

    await waitFor(() => expect(result.current[0]).toEqual({ count: 2 }));
    expect(window.localStorage.getItem(key)).toBe(JSON.stringify({ count: 2 }));
  });

  it('removes the entry from storage when setState is called with a nil value', async () => {
    const key = 'remove-key';
    const initial = 'initial';
    const { result } = renderHook(() => useLocalStorage<string | null>(key, initial));

    await waitFor(() => {
      expect(window.localStorage.getItem(key)).toBe(JSON.stringify(initial));
    });

    act(() => {
      result.current[1](null);
    });

    await waitFor(() => expect(window.localStorage.getItem(key)).toBeNull());
    // With no stored snapshot, the hook falls back to the initial value.
    expect(result.current[0]).toBe(initial);
  });

  it('synchronizes updates across instances sharing the same key', async () => {
    const key = 'cross-instance';
    const { result: a } = renderHook(() => useLocalStorage<string>(key, 'start'));
    const { result: b } = renderHook(() => useLocalStorage<string>(key, 'start'));

    act(() => {
      a.current[1]('updated');
    });

    await waitFor(() => expect(a.current[0]).toBe('updated'));
    await waitFor(() => expect(b.current[0]).toBe('updated'));
  });
});
