import { loadable } from 'jotai/utils';
import { Atom, atom } from 'jotai';
import isNil from 'es-toolkit/compat/isNil';

/**
 * Creates a loadable atom that returns the provided data if available,
 * otherwise fetches the data using the given fetchAtom.
 *
 * @template T - The type of the data.
 * @param data - The data to use if it is defined; if undefined, the fetchAtom will be used.
 * @param fetchAtom - An atom that resolves to the data asynchronously if data is not provided.
 * @returns A loadable atom that resolves to the data either from the provided value or by fetching.
 */
export function conditionalAtom<T>(data: T | null | undefined, fetchAtom: Atom<Promise<T>>) {
  const innerAtom = atom(async (get) => {
    if (!isNil(data)) {
      return data;
    }
    return await get(fetchAtom);
  });
  innerAtom.debugLabel = 'inner-conditional-atom';
  return loadable(innerAtom);
}
