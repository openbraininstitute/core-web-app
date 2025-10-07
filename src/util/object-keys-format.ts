import snakeCase from 'es-toolkit/compat/snakeCase';
import camelCase from 'es-toolkit/compat/camelCase';
import { mapKeysDeep } from 'deepdash-es/standalone';

type SnakeCase<S extends string> = S extends `${infer T}_${infer Rest}`
  ? `${Lowercase<T>}_${SnakeCase<Rest>}` // Key is already in snake_case
  : S extends `${infer T}${infer Rest}`
    ? T extends Capitalize<T>
      ? `_${Lowercase<T>}${SnakeCase<Rest>}`
      : `${T}${SnakeCase<Rest>}`
    : S;

type DeepSnakeCase<T> =
  T extends Array<infer U> // Check if T is an array
    ? DeepSnakeCase<U>[] // Process the items of the array
    : T extends object // Check if T is a plain object
      ? {
          [K in keyof T as K extends string ? SnakeCase<K> : K]: T[K] extends Function // Keep methods unchanged
            ? T[K]
            : DeepSnakeCase<T[K]>; // Recursively apply to nested objects
        }
      : T; // Keep primitive types unchanged

type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${Lowercase<T>}${Capitalize<CamelCase<U>>}` // Convert each part to camelCase
  : S extends `${infer T}${infer U}`
    ? `${Lowercase<T>}${CamelCase<U>}` // Handle any remaining parts
    : S; // If it's a single segment, return as is

type DeepCamelCase<T> =
  T extends Array<infer U> // Check if T is an array
    ? DeepCamelCase<U>[] // Process the items of the array
    : T extends object // Check if T is a plain object
      ? {
          [K in keyof T as K extends string ? CamelCase<K> : K]: T[K] extends Function // Keep methods unchanged
            ? T[K]
            : DeepCamelCase<T[K]>; // Recursively apply to nested objects
        }
      : T; // Keep primitive types unchanged

export function convertObjectKeystoCamelCase<T>(obj: T): DeepCamelCase<T> {
  return mapKeysDeep(obj, (_, key) => camelCase(key as string)) as DeepCamelCase<T>;
}

export function convertObjectKeysToSnakeCase<T>(obj: T): DeepSnakeCase<T> {
  return mapKeysDeep(obj, (_, key) => snakeCase(key as string));
}
