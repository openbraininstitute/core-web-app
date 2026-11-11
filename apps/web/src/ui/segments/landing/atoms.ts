import { atom, useAtom } from 'jotai';

const atomCurrency = atom('CHF');

export function useCurrency(): [currency: string, (currency: string) => void] {
  return useAtom(atomCurrency);
}
