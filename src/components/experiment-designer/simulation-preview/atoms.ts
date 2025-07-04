import { atom } from 'jotai';

interface NodeSetsPalette {
  [key: string]: string;
}

export const nodeSetsPaletteAtom = atom<NodeSetsPalette>({});
