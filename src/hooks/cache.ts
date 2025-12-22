import React from 'react';

export function useCacheLastRecentlyInserted<T>(): CacheLastRecentlyInserted<T> {
  const refCache = React.useRef<CacheLastRecentlyInserted<T> | null>(null);
  if (!refCache.current) {
    refCache.current = new CacheLastRecentlyInserted<T>();
  }
  return refCache.current;
}

class CacheLastRecentlyInserted<T> {
  private readonly map = new Map<string, T>();

  private readonly keys: string[] = [];

  constructor(public readonly maxSize = 100) {}

  set(key: string, value: T) {
    const { map, keys } = this;
    this.delete(key);
    map.set(key, value);
    keys.unshift(key);
    while (keys.length > this.maxSize) {
      // Remove the older one.
      const lastKey = keys.pop();
      if (typeof lastKey !== 'string') break;

      map.delete(lastKey);
    }
  }

  get(key: string): T | undefined {
    return this.map.get(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  delete(key: string): boolean {
    const { map, keys } = this;
    const index = keys.indexOf(key);
    if (index === -1) return false;

    keys.splice(index, 1);
    map.delete(key);
    return true;
  }
}
