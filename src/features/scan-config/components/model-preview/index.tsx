'use client';

import { memo } from 'react';
import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { useFlag } from '@/features/feature-flags';
import { electrodeOverlaysFlag } from '@/features/feature-flags/flags';
import {
  CircuitPreview,
  type ElectrodeOverlayOptions,
} from '@/features/scan-config/components/model-preview/circuit-preview';
import {
  resolveEnableCellHover,
  resolveEnableElectrodes,
} from '@/features/scan-config/components/model-preview/resolve-enable-electrodes';
import { NeuronVisualizer } from '@/ui/segments/workflows/simulate/single-neuron/shared/steps/neuron-visualizer';

import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

export function ModelPreview({
  model,
  electrodes,
  defaultNeuronOpacity,
  /**
   * When set, overrides the feature flag for electrode overlays.
   * Useful for data-details hosts that opt in/out independently of the build flag.
   */
  electrodeOverlaysEnabled,
  /** Domain-resolved viewer features (electrodes / colorBy / hover / nodes table). */
  viewerFeatures,
}: {
  model: TSupportedEntitiesForScanConfiguration;
  /** The electrode-overlay layer; omit for a plain circuit viewer. */
  electrodes?: ElectrodeOverlayOptions;
  /**
   * Initial neuron opacity for the circuit viewer. Host-owned (scan-config,
   * details, …). Omit for 100%; pass e.g. 0.2 when electrodes should dominate.
   */
  defaultNeuronOpacity?: number;
  /**
   * Explicit electrode-overlay gate. When omitted, uses
   * {@link electrodeOverlaysFlag}.
   */
  electrodeOverlaysEnabled?: boolean;
  viewerFeatures?: Partial<IEntityViewerFeatures>;
}) {
  const flagEnabled = useFlag(electrodeOverlaysFlag.key);
  const featureEnabled = electrodeOverlaysEnabled ?? !!flagEnabled;
  const domainElectrodes = viewerFeatures?.electrodes ?? false;

  const featuresForSmall = (circuit: ICircuit): Partial<IEntityViewerFeatures> => ({
    ...viewerFeatures,
    cellHover: resolveEnableCellHover({
      domainCellHover: viewerFeatures?.cellHover,
      scale: circuit.scale,
    }),
    electrodes:
      domainElectrodes &&
      resolveEnableElectrodes({
        featureEnabled,
        scale: circuit.scale,
        // ERA build opts into electrodes for single-neuron circuits too.
        allowSingleScale: domainElectrodes,
      }),
  });

  const featuresForLarge: Partial<IEntityViewerFeatures> = {
    ...viewerFeatures,
    electrodes:
      domainElectrodes &&
      resolveEnableElectrodes({
        featureEnabled,
        largeCircuit: true,
      }),
  };

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
            electrodes={electrodes}
            enableVisualization
            features={featuresForSmall(circuit as ICircuit)}
            defaultNeuronOpacity={defaultNeuronOpacity}
          />
        )
      )
      .with({ type: EntityTypeDict.Circuit }, () => (
        <CircuitPreview
          circuit={model as ICircuit}
          electrodes={electrodes}
          enableVisualization
          largeCircuit
          features={featuresForLarge}
          defaultNeuronOpacity={defaultNeuronOpacity}
        />
      ))
      .otherwise(() => null)
  );
}

export default memo(ModelPreview);
