import { MorphoViewerSignals } from '@openbraininstitute/morphoviewer';
import dynamic from 'next/dynamic';
import React from 'react';

export {
  MorphologyCanvas,
  MorphoViewerSignals,
  MorphoViewerTreeItemType,
  morphoViewerConvertMorphologyIntoTree,
  TgdColor,
  tgdFullscreenToggle,
} from '@openbraininstitute/morphoviewer';

export type {
  ColoringType,
  MorphoViewerElectrodeInjection,
  MorphoViewerElectrodeRecording,
  MorphoViewerMorphologyLocationHover,
  MorphoViewerMorphologyLocationLabel,
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
  React.useEffect(() => {
    const item = globalThis.localStorage.getItem('@openbraininstitute/morphoviewer:debug');
    setDebugMode(!!item && item.length > 0);
  }, []);
  return debugMode;
}
