import { atom } from 'jotai';
import memoizeOne from 'memoize-one';
import { InitializePartial } from './types';

export const getInitializationAtom = memoizeOne((circuit_id: string) => {
  return atom<InitializePartial>({ type: 'SimulationsForm.Initialize', circuit_id });
});

export const getErrorsAtom = memoizeOne((_circuit_id: string) => {
  return atom(false);
});
