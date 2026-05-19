import { MorphoViewerTreeItemType } from '@openbraininstitute/morphoviewer';
import { memo } from 'react';
import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { CircuitPreview } from '@/features/scan-config/components/model-preview/circuit-preview';
import { MorphoViewerSimul, type MorphoViewerTree } from '@/morpho-viewer';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';
import { cn } from '@/utils/css-class';

import ViewerLayout from './viewer-layout';

import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

export function ModelPreview({ model }: { model: TSupportedEntitiesForScanConfiguration }) {
  return match(model)
    .with({ type: EntityTypeDict.Memodel }, () => (
      <NeuronVisualizer
        memodelId={model.id}
        sessionId={model.id}
        disableElectrodes
        disableSynapses
      />
    ))
    .with(
      {
        type: EntityTypeDict.Circuit,
        scale: P.union(CircuitScaleDictionary.PairNeuron, CircuitScaleDictionary.SmallMicrocircuit),
      },
      () => <CircuitPreview circuit={model as ICircuit} />
    )
    .with({ type: EntityTypeDict.Circuit }, () => (
      <div className="px-5 text-gray-500">
        <div className="text-lg uppercase">Preview</div>
        <div className="mt-2">Coming soon</div>
      </div>
    ))
    .otherwise(() => null);
}

export default memo(ModelPreview);
