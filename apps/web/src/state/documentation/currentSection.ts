import { atom } from 'jotai';

import type { SingleSectionProps } from '@/components/documentation/type';

export const activeNavItemAtom = atom<SingleSectionProps | null>(null);
