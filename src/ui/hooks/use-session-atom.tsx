import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';

export const makeSessionAtomWithDefault = <T = any>(defaults: T) =>
  atomFamily(
    (_key: string) => {
      const childAtom = atom<T>(defaults);
      childAtom.debugLabel = `session/${_key}`;
      return childAtom;
    },
    (a, b) => a === b
  );
