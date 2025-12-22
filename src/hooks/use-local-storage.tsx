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
      } catch (_e) {
        return null;
      }
    }

    if (isNil(initialValue)) {
      return null;
    }
    try {
      return JSON.stringify(initialValue);
    } catch (_error) {
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
      } catch (_e) {}
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
