'use client';

import { atomWithStorage, atomFamily } from 'jotai/utils';
import superjson from 'superjson';
import z from 'zod';

import type { ZodType } from 'zod';

export function createZodSuperJsonStorage<T>(schema: z.ZodType<T>, storage: Storage) {
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
          const errors = error.formErrors.fieldErrors;
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
          const errors = error.formErrors.fieldErrors;
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

export const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
  key: () => null,
  length: 0,
};

export function makeStorageAtomFamily<T>(schema: ZodType<T>, initialValue: T, storage: Storage) {
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
