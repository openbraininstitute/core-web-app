import { atom } from 'jotai';
import { memoize } from '@/util/utils';
import { SimulationType } from '@/types/virtual-lab/lab';

type Tab = 'new' | 'browse';

export const selectedTabFamily = memoize((_key: string) => {
  return atom<Tab>('new');
});

export const selectedSimTypeFamily = memoize((_key: string) => {
  return atom<SimulationType | null>(null);
});
