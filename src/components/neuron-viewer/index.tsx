import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { type RefObject, useCallback, useEffect, useRef } from 'react';

import { useNeuronViewerActions } from '@/components/neuron-viewer/hooks/actions-hook';
import { useNeuronViewerEvents } from '@/components/neuron-viewer/hooks/events-hook';
import { NeuronLoader } from '@/components/neuron-viewer/plugins/neuron-loader';
import { useAppNotification } from '@/components/notification';
import { DEFAULT_CURRENT_INJECTION_CONFIG } from '@/constants/simulate/single-neuron';
import { useMorphology } from '@/hooks/use-morphology';
import {
  NeuronViewerRenderer,
  type TNeuronViewerConfig,
} from '@/services/bluenaas-single-cell/renderer';
import { DefaultInjectionColor } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import {
  RECORDING_LOCATION_CONFIGURATION_SESSION_KEY,
  STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  neuronSectionNamesAtomFamily,
  RecordLocationConfigurationAtomFamily,
  StimulationConfigurationAtomFamily,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/context';
import { getSessionKey } from '@/ui/segments/workflows/simulate/single-neuron/shared/helpers';
import { NeuronLocationOriginDict } from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

import type { Morphology } from '@/services/bluenaas-single-cell/types';

export { LoadingNeuronSpinner } from './loading-neuron-spinner';

type Props = {
  virtualLabId: string;
  projectId: string;
  meModelId: string;
  sessionId: string;
  useEvents?: boolean;
  useActions?: boolean;
  useZoomer?: boolean;
  useCursor?: boolean;
  /**
   * If `true`, an overlay with the labels for Recording and Injection
   * will be added to the display.
   */
  useLabels?: boolean;
  actions?: TNeuronViewerConfig;
  children?: ({
    renderer,
    useZoomer,
    useCursor,
    useActions,
  }: {
    renderer: RefObject<NeuronViewerRenderer | null>;
    useZoomer?: boolean;
    useCursor?: boolean;
    useActions?: boolean;
  }) => React.ReactNode;
};

export function NeuronViewer({
  children,
  meModelId,
  useEvents,
  useActions,
  useZoomer,
  useCursor,
  useLabels,
  actions,
  virtualLabId,
  projectId,
  sessionId,
}: Props) {
  const labelsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<NeuronViewerRenderer | null>(null);
  const setSecNames = useSetAtom(neuronSectionNamesAtomFamily(sessionId));
  const { error: notifyError } = useAppNotification();

  const setSectionsAndSegments = useCallback(
    (morphology: Morphology) => {
      const sectionNames = Object.keys(morphology);
      setSecNames(sectionNames);

      if (!sectionNames.includes(DEFAULT_CURRENT_INJECTION_CONFIG.inject_to)) {
        throw new Error('No soma section present');
      }
    },
    [setSecNames]
  );

  const runRenderer = useCallback(
    (morphology: Morphology) => {
      if (rendererRef.current && containerRef.current) {
        const prunedMorph = rendererRef.current.removeNoDiameterSection(morphology);
        rendererRef.current.addMorphology(prunedMorph);
        setSectionsAndSegments(prunedMorph);
      }
    },
    [setSectionsAndSegments]
  );

  useEffect(() => {
    if (!rendererRef.current && containerRef.current) {
      const renderer = new NeuronViewerRenderer(containerRef.current, {});
      renderer.labels.canvas = labelsCanvasRef.current;
      rendererRef.current = renderer;
    }
  }, []);

  const { loading, error } = useMorphology({
    modelId: meModelId,
    callback: runRenderer,
    projectId,
    virtualLabId,
  });

  if (error) {
    throw new Error(`Morphology initialization error: ${error}`);
  }

  useNeuronViewerEvents({
    useEvents,
    renderer: rendererRef,
  });

  useNeuronViewerActions({
    useActions,
    actions,
    renderer: rendererRef,
  });

  const sessionKey = `${RECORDING_LOCATION_CONFIGURATION_SESSION_KEY}-${sessionId}`;
  const recordingAtom = RecordLocationConfigurationAtomFamily(sessionKey);

  const [recordLocations] = useAtom(recordingAtom);

  const stimulationKey = getSessionKey(STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY, sessionId);
  const injectionSessionAtom = useAtomValue(StimulationConfigurationAtomFamily(stimulationKey));

  useEffect(() => {
    if (useLabels && !loading && rendererRef.current && sessionId) {
      const injection = {
        section: injectionSessionAtom.inject_to,
        offset: 0.5,
        record_currents: false,
        color: DefaultInjectionColor,
        origin: NeuronLocationOriginDict.injection,
      };
      rendererRef.current.labels.update([injection, ...recordLocations]);
    }
  }, [useLabels, loading, recordLocations, sessionId, injectionSessionAtom.inject_to]);

  if (error) {
    notifyError({ message: `Morphology initialization error: ${error}`, placement: 'topRight' });
    return;
  }

  return (
    <div className="relative h-full w-full rounded-2xl">
      {loading && (
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
          <NeuronLoader text="Loading Neuron" />
        </div>
      )}
      <div
        className="h-full w-full [&_canvas]:rounded-2xl"
        ref={containerRef}
        // NOTE: this is removed because it does not getting the exact pointer position due the scale and nature of the custom cursor
        // style={{
        //   cursor: `url(${basePath}/images/HandCursor.webp), pointer`,
        // }}
      />
      <canvas
        ref={labelsCanvasRef}
        className="pointer-events-none absolute top-0 left-0 size-full rounded-2xl"
      />
      {children?.({
        useZoomer,
        useCursor,
        useActions,
        renderer: rendererRef,
      })}
    </div>
  );
}

export default NeuronViewer;
