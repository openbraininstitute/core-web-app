'use client';

import { atomWithStorage, atomFamily } from 'jotai/utils';
import superjson from 'superjson';
import z from 'zod';

import type { ZodType } from 'zod';

export class ValidationError extends Error {
  public readonly issues?: z.core.$ZodIssue[] | null;

  public readonly cause?: string | null;

  constructor(message: string, issues: z.core.$ZodIssue[] | null, cause: string | null) {
    super(message);
    this.issues = issues;
    this.cause = cause;
  }
}

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
          const errors = error.issues;
          throw new ValidationError('validation error', errors, null);
        } else {
          throw new ValidationError('storage error', null, 'setting storage error');
        }
      }
    },

    setItem(key: string, value: T): void {
      try {
        schema.parse(value);
        storage.setItem(key, superjson.stringify(value));
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors = error.issues;
          throw new ValidationError('validation error', errors, null);
        } else {
          throw new ValidationError('storage error', null, 'setting storage error');
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
