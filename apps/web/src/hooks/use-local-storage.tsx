'use client';

import isNil from 'es-toolkit/compat/isNil';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

function dispatchStorageEvent(key: string, newValue: string | null): void {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

const setLocalStorageItem = (key: string, value: any): void => {
  const stringifiedValue = JSON.stringify(value);
  window.localStorage.setItem(key, stringifiedValue);
  dispatchStorageEvent(key, stringifiedValue);
};

const removeLocalStorageItem = (key: string): void => {
  window.localStorage.removeItem(key);
  dispatchStorageEvent(key, null);
};

const getLocalStorageItem = (key: string): string | null => {
  return window.localStorage.getItem(key);
};

// A corrupted or schema-changed value must never crash the render that reads it;
// fall back to the initial value instead, mirroring an absent key.
function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const useLocalStorageSubscribe = (callback: (event: StorageEvent) => void): (() => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const getSnapshot = () => getLocalStorageItem(key);

  const getServerSnapshot = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        return getLocalStorageItem(key);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          'useLocalStorage: Error reading from localStorage on client during getServerSnapshot call',
          e
        );
        return null;
      }
    }

    if (isNil(initialValue)) {
      return null;
    }
    try {
      return JSON.stringify(initialValue);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `useLocalStorage: Non-JSON serializable initialValue for key "${key}" during SSR. Falling back to null snapshot.`,
        error
      );
      return null;
    }
  }, [key, initialValue]);

  const store = useSyncExternalStore(useLocalStorageSubscribe, getSnapshot, getServerSnapshot);

  const setState = useCallback(
    (v: T | ((val: T) => T)) => {
      try {
        const nextState =
          typeof v === 'function' ? (v as (val: T) => T)(safeParse(store, initialValue)) : v;

        if (isNil(nextState)) {
          removeLocalStorageItem(key);
        } else {
          setLocalStorageItem(key, nextState);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(e);
      }
    },
    [key, store, initialValue]
  );

  useEffect(() => {
    if (getLocalStorageItem(key) === null && typeof initialValue !== 'undefined') {
      setLocalStorageItem(key, initialValue);
    }
  }, [key, initialValue]);

  return [safeParse(store, initialValue), setState];
}
