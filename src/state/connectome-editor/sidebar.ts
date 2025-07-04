import { atom } from 'jotai';

type BrainArea = 'pre' | 'post' | null;
export default atom<BrainArea>(null);
