import dynamic from 'next/dynamic';

export {
  MorphologyCanvas,
  morphoViewerConvertMorphologyIntoTree,
  TgdColor,
  tgdFullscreenToggle,
} from '@openbraininstitute/morphoviewer';

export type {
  MorphoViewerElectrodeInjection,
  MorphoViewerElectrodeRecording,
  MorphoViewerSynapsesGroup,
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
