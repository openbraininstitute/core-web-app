import { atom } from 'jotai';

import { SingleSectionProps } from '@/components/documentation/type';

export const activeNavItemAtom = atom<SingleSectionProps | null>(null);
