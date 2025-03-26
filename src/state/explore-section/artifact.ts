import { atom, useAtom, useAtomValue } from 'jotai';

const atomArtifact = atom('Morphology');

export function useCurrentExplorerArtifact() {
  return useAtom(atomArtifact);
}

export function useCurrentExplorerArtifactValue() {
  return useAtomValue(atomArtifact);
}
