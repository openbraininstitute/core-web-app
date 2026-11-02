import dynamic from 'next/dynamic';

export {
  morphoViewerConvertMorphologyIntoTree,
  TgdColor,
  tgdFullscreenToggle,
} from '@openbraininstitute/morphoviewer';

export type {
  MorphoViewerElectrodeInjection,
  MorphoViewerElectrodeRecording,
  MorphoViewerSynapsesGroup,
} from '@openbraininstitute/morphoviewer';

export const MorphoViewerSingleNeuron = dynamic(
  () => import('@openbraininstitute/morphoviewer').then((m) => m.MorphoViewerSimul),
  { ssr: false }
);
