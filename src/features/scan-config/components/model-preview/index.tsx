import { MorphoViewerTreeItemType } from '@openbraininstitute/morphoviewer';
import { memo } from 'react';
import { match } from 'ts-pattern';

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
    .with({ type: EntityTypeDict.Circuit, scale: CircuitScaleDictionary.Single }, () => (
      <ViewerLayout model={model} />
    ))
    .with({ type: EntityTypeDict.Circuit }, () => <CircuitPreview circuit={model as ICircuit} />)
    .otherwise(() => null);
}

export default memo(ModelPreview);
