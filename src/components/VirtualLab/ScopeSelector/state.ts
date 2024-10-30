import { atom } from 'jotai';
import { memoize } from '@/util/utils';
import { SimulationType } from '@/types/virtual-lab/lab';

type Tab = 'new' | 'browse';

export const selectedTabFamily = memoize((_key: string) => {
  return atom<Tab>('new');
});

export const selectedNewSimTypeFamily = memoize((_key: string) => {
  return atom<SimulationType | null>(null);
});

export const selectedBrowseSimTypeFamily = memoize((_key: string) => {
  return atom<SimulationType>(SimulationType.IonChannel);
});
