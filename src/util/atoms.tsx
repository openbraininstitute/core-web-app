import { Atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

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
