import { MorphoViewerSignals } from '@openbraininstitute/morphoviewer';
import dynamic from 'next/dynamic';
import React from 'react';

import { isMorphoViewerDebugMode } from './debug-mode';

export {
  MorphologyCanvas,
  MorphoViewerSignals,
  morphoViewerConvertMorphologyIntoTree,
  TgdColor,
  tgdFullscreenToggle,
} from '@openbraininstitute/morphoviewer';

// Through `./tree-item-type`, not the package: re-exporting it from both would
// leave one enum with two import paths, and a module that took the wrong one
// would pull in a WebGL renderer to read an enum.
export { MorphoViewerTreeItemType } from './tree-item-type';

export type {
  ColoringType,
  MorphoViewerElectrodeInjection,
  MorphoViewerElectrodeRecording,
  MorphoViewerMorphologyLocationHover,
  MorphoViewerMorphologyLocationLabel,
  MorphoViewerMorphologyLocationMarker,
  MorphoViewerMorphologyLocationPick,
  MorphoViewerMorphologyLocationSelection,
  MorphoViewerOctreeProps,
  /** Absolute origin + rotation from electrode overlay drag/rotate (`phase: 'end'`). */
  MorphoViewerOverlayTransformEvent,
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
  MorphoViewerSmallCircuitProps,
  MorphoViewerSnapshotOptions,
  MorphoViewerSynapsesGroup,
  MorphoViewerTree,
  MorphoViewerTreeItem,
  SectionColors,
} from '@openbraininstitute/morphoviewer';

export const MorphoViewerOctree = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerOctree),
  { ssr: false }
);

export const MorphoViewerSingleNeuron = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSimul),
  { ssr: false }
);

export const MorphoViewerCircuitMultipleNeurons = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSmallCircuit),
  { ssr: false }
);

export const MorphoViewerCircuitMultipleNeuronsSomaOnly = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSomasOnly),
  { ssr: false }
);

/** stable per-component signal bus for driving a viewer (camera reset, snapshot) */
export function useMorphoViewerSignals(): MorphoViewerSignals {
  const ref = React.useRef<MorphoViewerSignals | null>(null);
  if (!ref.current) ref.current = new MorphoViewerSignals();
  return ref.current;
}

export function useMorphoViewerDebugMode(): boolean {
  const [debugMode, setDebugMode] = React.useState(false);
  // Read in an effect rather than as the initial state: the flag lives in
  // `localStorage`, which the server render has no view of.
  React.useEffect(() => setDebugMode(isMorphoViewerDebugMode()), []);
  return debugMode;
}
