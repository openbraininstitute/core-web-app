import { memo } from 'react';
import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { CircuitPreview } from '@/features/scan-config/components/model-preview/circuit-preview';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';

import type { Config, TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

export function ModelPreview({
  model,
  config,
  setConfig,
  selectedRootElement,
  selectedEntry,
}: {
  model: TSupportedEntitiesForScanConfiguration;
  /** Live scan-config (used for electrode_locations overlays). */
  config?: Config;
  /** When set, electrode drag/rotate in the 3D view writes back to the form. */
  setConfig?: (newConfig: Config | ((prev: Config) => Config)) => void;
  /** Schema root currently selected in the form (e.g. `electrode_locations`). */
  selectedRootElement?: string;
  /** Dictionary entry name currently selected (overlay id when electrodes). */
  selectedEntry?: string;
}) {
  return (
    match(model)
      .with({ type: EntityTypeDict.Memodel }, () => (
        <NeuronVisualizer
          memodelId={model.id}
          sessionId={model.id}
          disableElectrodes
          disableSynapses
        />
      ))
      // Single / pair / small share CircuitPreview + MorphoViewerSmallCircuit.
      // Loader strategy is selected inside CircuitViz by scale (SONATA vs OBI-One).
      // Electrodes stay off for single until that path is validated end-to-end.
      .with(
        {
          type: EntityTypeDict.Circuit,
          scale: P.union(
            CircuitScaleDictionary.Single,
            CircuitScaleDictionary.PairNeuron,
            CircuitScaleDictionary.SmallMicrocircuit
          ),
        },
        (circuit) => (
          <CircuitPreview
            circuit={circuit as ICircuit}
            config={config}
            setConfig={setConfig}
            selectedRootElement={selectedRootElement}
            selectedEntry={selectedEntry}
            enableVisualization
            enableElectrodes={circuit.scale !== CircuitScaleDictionary.Single}
          />
        )
      )
      .with({ type: EntityTypeDict.Circuit }, () => (
        <CircuitPreview
          circuit={model as ICircuit}
          config={config}
          setConfig={setConfig}
          selectedRootElement={selectedRootElement}
          selectedEntry={selectedEntry}
          enableVisualization
          largeCircuit
        />
      ))
      .otherwise(() => null)
  );
}

export default memo(ModelPreview);
