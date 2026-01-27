import type { Atom, WritableAtom } from 'jotai';
import { atomFamily, atomWithRefresh } from 'jotai/utils';

/**
  Creates an atom family with automatic expiration after a specified time-to-live (TTL).

  @param initializeReadAtom - Function that creates a read-only atom for a given parameter
  @param options - Configuration object containing:
    - ttl: Time-to-live in milliseconds before the atom is removed
    - areEqual: Optional comparison function to determine parameter equality

  @returns An atom family that automatically removes atoms after their TTL expires

  TODO: add an option to refresh after expiration
*/
export function readAtomFamilyWithExpiration<T, P>(
  initializeReadAtom: (param: T) => Atom<P>,
  options: { ttl: number; areEqual?: (a: T, b: T) => boolean }
) {
  const family = atomFamily((param) => {
    const readAtom = initializeReadAtom(param);
    const wrapperAtomWithRefresh = atomWithRefresh((get) => get(readAtom));

    let ttlTimeoutId: ReturnType<typeof setTimeout>;
    let createdAt: number = 0;

    const cleanup = () => family.remove(param);

    wrapperAtomWithRefresh.onMount = () => {
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

    return wrapperAtomWithRefresh;
  }, options.areEqual);

  return family;
}

// ! This is potential fix for the issue where refresh doesn't work as expected
// TODO: to be tested and to replace the original fn (above) afterwards.
/**
  Creates an atom family with automatic expiration after a specified time-to-live (TTL).

  @param initializeReadAtom - Function that creates a writable atom for a given parameter
  @param options - Configuration object containing:
    - ttl: Time-to-live in milliseconds before the atom is removed
    - areEqual: Optional comparison function to determine parameter equality

  @returns An atom family that automatically removes atoms after their TTL expires
*/
export function atomFamilyWithExpiration<
  FamilyParam,
  AtomValue,
  SetAtomArgs extends unknown[],
  SetAtomResult,
>(
  initializeWritableAtom: (
    param: FamilyParam
  ) => WritableAtom<AtomValue, SetAtomArgs, SetAtomResult>,
  options: { ttl: number; areEqual?: (a: FamilyParam, b: FamilyParam) => boolean }
) {
  const family = atomFamily((param) => {
    const atom = initializeWritableAtom(param);

    let ttlTimeoutId: ReturnType<typeof setTimeout>;
    let createdAt: number = 0;

    const cleanup = () => family.remove(param);

    atom.onMount = () => {
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

    return atom;
  }, options.areEqual);

  return family;
}
