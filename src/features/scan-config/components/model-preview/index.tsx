import { memo } from 'react';
import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { CircuitPreview } from '@/features/scan-config/components/model-preview/circuit-preview';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';

import ViewerLayout from './viewer-layout';

import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

export function ModelPreview({
  model,
  positionAbsolute,
  onCollapsed,
}: {
  model: TSupportedEntitiesForScanConfiguration;
  positionAbsolute?: boolean;
  onCollapsed?(value: boolean): void;
}) {
  return match(model)
    .with({ type: EntityTypeDict.Memodel }, () => (
      <NeuronVisualizer
        memodelId={model.id}
        sessionId={model.id}
        disableElectrodes
        disableSynapses
        positionAbsolute={positionAbsolute}
        onCollapsed={onCollapsed}
      />
    ))
    .with({ type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single }, () => (
      <ViewerLayout model={model} />
    ))
    .with(
      {
        type: EntityTypeDict.Circuit,
        scale: P.union(CircuitScaleDictionary.PairNeuron, CircuitScaleDictionary.SmallMicrocircuit),
      },
      () => <CircuitPreview circuit={model as ICircuit} enableVisualization />
    )
    .with({ type: EntityTypeDict.Circuit }, () => (
      <CircuitPreview circuit={model as ICircuit} enableVisualization largeCircuit />
    ))
    .otherwise(() => null);
}

export default memo(ModelPreview);
