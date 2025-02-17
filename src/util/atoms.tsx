import { Atom } from 'jotai';
import { atomFamily, atomWithRefresh } from 'jotai/utils';

export function atomFamilyWithExpiration<T, P extends Atom<unknown>>(
  initialValue: (param: T) => P,
  options: { ttl: number; areEqual?: (a: T, b: T) => boolean }
) {
  const family = atomFamily<T, P>(initialValue, options.areEqual);

  family.setShouldRemove((createdAt) => {
    return Date.now() > createdAt + options.ttl;
  });

  return family;
}

/**
 * Creates an atom family with expiration functionality.
 *
 * The `atomFamilyFactoryWithExpiration` function creates an atom family that
 * automatically removes expired atoms based on a specified time-to-live (TTL) option.
 *
 * @param readFn - A function that returns the initial value for each atom in the family.
 * @param options - An object with the following properties:
 *   - `ttl`: The time-to-live (in milliseconds) for each atom in the family.
 *   - `areEqual`: An optional function to compare the equality of the atom getter parameters.
 * @returns An atom family with expiration functionality.
 *
 * TODO: add an option to refresh after expiration
 */
export function atomFamilyFactoryWithExpiration<T, P>(
  readFn: (param: T) => P,
  options: { ttl: number; areEqual?: (a: T, b: T) => boolean }
) {
  const family = atomFamily((param) => {
    const dataAtom = atomWithRefresh(() => readFn(param));

    let ttlTimeoutId: ReturnType<typeof setTimeout>;
    let createdAt: number = 0;

    const cleanup = () => family.remove(param);

    dataAtom.onMount = (setAtom) => {
      if (ttlTimeoutId) {
        clearTimeout(ttlTimeoutId);
      } else {
        createdAt = Date.now();
      }

      return () => {
        const now = Date.now();
        if (now - createdAt > options.ttl) {
          // Clean up if already expired.
          cleanup();
        } else {
          // Clean up after ttl.
          ttlTimeoutId = setTimeout(cleanup, now - createdAt + options.ttl);
        }
      };
    };

    return dataAtom;
  }, options.areEqual);

  return family;
}
