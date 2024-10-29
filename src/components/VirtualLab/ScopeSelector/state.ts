import { atom } from 'jotai';
import { memoize } from '@/util/utils';

type Tab = 'new' | 'browse';

export const selectedTabFamily = memoize((_key: string) => {
  return atom<Tab>('new');
});
