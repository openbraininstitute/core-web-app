'use client';

import { atom } from 'jotai';
import type { Session } from 'next-auth';

const sessionAtom = atom<Session | null>(null);

export default sessionAtom;
