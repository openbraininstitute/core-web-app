import { atomFamily } from 'jotai/utils';
import { atom } from 'jotai';

export const makeSessionAtomWithDefault = <T = any,>(defaults: T) =>
  atomFamily(
    (_key: string) => {
      const childAtom = atom<T>(defaults);
      childAtom.debugLabel = `session/${_key}`;
      return childAtom;
    },
    (a, b) => a === b
  );
