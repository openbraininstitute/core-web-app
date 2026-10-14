import dynamic from 'next/dynamic';

export {
  MorphologyCanvas,
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
  MorphoViewerMorphologyLocationMarker,
  MorphoViewerMorphologyLocationPick,
  MorphoViewerMorphologyLocationSelection,
  MorphoViewerSignals,
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
  MorphoViewerSmallCircuitProps,
  MorphoViewerSynapsesGroup,
  MorphoViewerTree,
  MorphoViewerTreeItem,
  SectionColors,
} from '@openbraininstitute/morphoviewer';

export const MorphoViewerSingleNeuron = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSimul),
  { ssr: false }
);

export const MorphoViewerCircuitMultipleNeurons = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSmallCircuit),
  { ssr: false }
);
