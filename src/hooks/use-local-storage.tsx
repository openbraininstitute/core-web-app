'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import isNil from 'es-toolkit/compat/isNil';

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
          typeof v === 'function'
            ? (v as (val: T) => T)(store ? JSON.parse(store) : initialValue)
            : v;

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

  return [store ? (JSON.parse(store) as T) : initialValue, setState];
}
