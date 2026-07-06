import dynamic from 'next/dynamic';
import React from 'react';

export {
  MorphologyCanvas,
  MorphoViewerTreeItemType,
  morphoViewerConvertMorphologyIntoTree,
  TgdColor,
  tgdFullscreenToggle,
} from '@openbraininstitute/morphoviewer';

export type {
  ColoringType,
  MorphoViewerElectrodeInjection,
  MorphoViewerElectrodeRecording,
  MorphoViewerOctreeProps,
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
  MorphoViewerSynapsesGroup,
  MorphoViewerTree,
  MorphoViewerTreeItem,
} from '@openbraininstitute/morphoviewer';

export const MorphoViewerOctree = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerOctree),
  { ssr: false }
);

export const MorphoViewerSimul = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSimul),
  { ssr: false }
);

export const MorphoViewerSmallCircuit = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSmallCircuit),
  { ssr: false }
);

export const MorphoViewerSomasOnly = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSomasOnly),
  { ssr: false }
);

export function useMorphoViewerDebugMode(): boolean {
  const [debugMode, setDebugMode] = React.useState(false);
  React.useEffect(() => {
    const item = globalThis.localStorage.getItem('@openbraininstitute/morphoviewer:debug');
    setDebugMode(!!item && item.length > 0);
  }, []);
  return debugMode;
}
