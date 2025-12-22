'use client';

import React from 'react';

export function getLocalStorageHelper() {
  return new LocalStorageHelper();
}

export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  typeGuard: (data: unknown) => data is T
): [value: T, setValue: (value: T) => void] {
  const [value, setValue] = React.useState(
    getLocalStorageHelper().get(key, defaultValue, typeGuard)
  );
  React.useEffect(() => {
    getLocalStorageHelper().set(key, value);
  }, [value, key]);
  return [value, setValue];
}

interface StorageHelperInterface {
  get<T>(key: string, defaultValue: T, typeGuard: (data: unknown) => data is T): T;
  set<T>(key: string, value: T): void;
}

class LocalStorageHelper implements StorageHelperInterface {
  get<T>(key: string, defaultValue: T, typeGuard: (data: unknown) => data is T): T {
    const storage = globalThis?.localStorage;
    if (!storage) return defaultValue;

    try {
      const data = storage.getItem(key);
      if (!data) return defaultValue;

      const value = JSON.parse(data);
      if (typeGuard(value)) return value;
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  set<T>(key: string, value: T): void {
    const storage = globalThis?.localStorage;
    if (!storage) return;

    storage.setItem(key, JSON.stringify(value));
  }
}
