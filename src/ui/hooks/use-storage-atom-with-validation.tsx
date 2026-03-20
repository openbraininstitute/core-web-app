'use client';

import { atomWithStorage } from 'jotai/utils';
import { atomFamily } from 'jotai-family';
import superjson from 'superjson';
import z from 'zod';

import type { ZodType } from 'zod';

export const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

export const safeStorage: Storage = typeof window !== 'undefined' ? sessionStorage : memoryStorage;

export function createZodSuperJsonStorage<T>(schema: ZodType<T, T>, storage: Storage) {
  return {
    getItem(key: string, initialValue: T): T {
      const storedValue = storage.getItem(key);
      if (storedValue === null) {
        return initialValue;
      }

      try {
        const parsed = superjson.parse(storedValue);
        return schema.parse(parsed);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.flatten().fieldErrors;
          throw new Error('validation error', {
            cause: errors,
          });
        } else {
          throw new Error('storage error', {
            cause: 'setting storage error',
          });
        }
      }
    },

    setItem(key: string, value: T): void {
      try {
        schema.parse(value);
        storage.setItem(key, superjson.stringify(value));
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.flatten().fieldErrors;
          throw new Error('validation error', {
            cause: errors,
          });
        } else {
          throw new Error('storage error', {
            cause: 'setting storage error',
          });
        }
      }
    },

    removeItem(key: string): void {
      storage.removeItem(key);
    },
  };
}

export function makeStorageAtomWithValidationFamily<T>(
  schema: ZodType<T, T>,
  initialValue: T,
  storage: Storage
) {
  const resolvedStorage = typeof window !== 'undefined' ? storage : memoryStorage;

  const family = atomFamily(
    (key: string) => {
      const atom = atomWithStorage(
        key,
        initialValue,
        createZodSuperJsonStorage(schema, resolvedStorage),
        {
          getOnInit: true,
        }
      );
      atom.debugLabel = key;
      return atom;
    },
    (a, b) => a === b
  );
  return family;
}

/**
 * Creates a storage interface that uses SuperJSON for serialization/deserialization
 * @template T The type of data being stored
 * @param {Storage} storage The storage interface to use (e.g. localStorage, sessionStorage)
 * @returns {Object} Storage interface with getItem, setItem and removeItem methods
 */
export function createSuperJsonStorage<T>(storage: Storage): {
  getItem: (key: string, initialValue: T) => T;
  setItem: (key: string, value: T) => void;
  removeItem: (key: string) => void;
} {
  return {
    /**
     * Gets an item from storage and parses it with SuperJSON
     * @param {string} key The storage key
     * @param {T} initialValue The default value if key doesn't exist
     * @returns {T} The parsed value or initial value
     * @throws {Error} If there is an error parsing the stored value
     */
    getItem(key: string, initialValue: T): T {
      const storedValue = storage.getItem(key);
      if (storedValue === null) {
        return initialValue;
      }

      try {
        const parsed = superjson.parse(storedValue);
        return parsed as T;
      } catch (error) {
        throw new Error('storage error', {
          cause: 'setting storage error',
        });
      }
    },

    /**
     * Stringifies and stores a value using SuperJSON
     * @param {string} key The storage key
     * @param {T} value The value to store
     * @throws {Error} If there is an error stringifying or storing the value
     */
    setItem(key: string, value: T): void {
      try {
        storage.setItem(key, superjson.stringify(value));
      } catch (error) {
        throw new Error('storage error', {
          cause: 'setting storage error',
        });
      }
    },

    /**
     * Removes an item from storage
     * @param {string} key The storage key to remove
     */
    removeItem(key: string): void {
      storage.removeItem(key);
    },
  };
}

/**
 * Creates an atom with storage persistence using SuperJSON serialization
 * @template T The type of data being stored in the atom
 * @param {string} key The storage key for the atom
 * @param {T} initialValue The default value if key doesn't exist in storage
 * @param {Storage} storage The storage interface to use (e.g. localStorage, sessionStorage)
 * @returns {Atom} A Jotai atom with storage persistence
 */
export function makeStorageAtomFamily<T>(initialValue: T, storage: Storage) {
  const resolvedStorage = typeof window !== 'undefined' ? storage : memoryStorage;

  const family = atomFamily(
    (key: string) => {
      const atom = atomWithStorage(key, initialValue, createSuperJsonStorage<T>(resolvedStorage), {
        getOnInit: true,
      });
      atom.debugLabel = key;
      return atom;
    },
    (a, b) => a === b
  );
  return family;
}
