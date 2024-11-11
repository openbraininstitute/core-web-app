import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { SimulationType } from '@/types/virtual-lab/lab';

type Tab = 'new' | 'browse';

export const selectedTabFamily = atomFamily((_key: string) => {
  return atom<Tab>('new');
});

export const selectedSimTypeFamily = atomFamily((_key: string) => {
  return atom<SimulationType>(SimulationType.SingleNeuron);
});

export const scopeSelectorExpandedAtom = atomFamily((_key: string) => {
  return atom(false);
});
