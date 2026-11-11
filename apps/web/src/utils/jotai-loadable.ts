import { type Atom, atom } from 'jotai';
import { unwrap } from 'jotai/utils';

export type TLoadableState<Value> = TLoadableLoading | TLoadableHasData<Value> | TLoadableHasError;
export const LoadableState = {
  Loading: 'loading',
  HasData: 'hasData',
  HasError: 'hasError',
} as const;

export type TLoadableStateType = (typeof LoadableState)[keyof typeof LoadableState];

type TLoadableLoading = { state: typeof LoadableState.Loading };
type TLoadableHasData<Value> = { state: typeof LoadableState.HasData; data: Awaited<Value> };
type TLoadableHasError = { state: typeof LoadableState.HasError; error: unknown };

export function createLoadableAtom<Value>(anAtom: Atom<Value>): Atom<TLoadableState<Value>> {
  const LoadingSentinel: unique symbol = Symbol('loading-sentinel');
  const unwrappedAtom = unwrap(anAtom, () => LoadingSentinel);

  return atom((get) => {
    try {
      const data = get(unwrappedAtom);
      if (data === LoadingSentinel) {
        return { state: LoadableState.Loading };
      }
      return { state: LoadableState.HasData, data: data as Awaited<Value> };
    } catch (error) {
      return { state: LoadableState.HasError, error };
    }
  });
}
