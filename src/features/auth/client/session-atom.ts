'use client';

import { atom } from 'jotai';

import type { Session } from '@/features/auth/types';

const sessionAtom = atom<Session | null>(null);

export default sessionAtom;
