'use client';

import { memo, useMemo } from 'react';
import { match, P } from 'ts-pattern';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { useFlag } from '@/features/feature-flags';
import { electrodeOverlaysFlag } from '@/features/feature-flags/flags';
import {
  CircuitPreview,
  type IElectrodeOverlayOptions,
} from '@/features/scan-config/components/model-preview/circuit-preview';
import {
  resolveEnableCellHover,
  resolveEnableElectrodes,
  resolveEnableMorphologyLocations,
} from '@/features/scan-config/components/model-preview/resolve-enable-electrodes';

import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { IFormBindingOptions } from '@/features/scan-config/components/model-preview/morphology-locations-block';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';

export function ModelPreview({
  model,
  form,
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
  /** The live form to bind the viewer to; omit for a read-only preview. */
  form?: IFormBindingOptions;
  /** The electrode-overlay layer; omit for a plain circuit viewer. */
  electrodes?: IElectrodeOverlayOptions;
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

  const picksLocations = resolveEnableMorphologyLocations(model);
  const viewerForm = useMemo(
    () => (form ? { ...form, supportsExplicitLocations: picksLocations } : undefined),
    [form, picksLocations]
  );

  return (
    match(model)
      // An MEModel shares the circuit viewer and its morphology-location picking.
      .with({ type: EntityTypeDict.Memodel }, () => (
        <CircuitPreview
          memodel={model}
          // The form binding lets a 3D click write a morphology location back into the form.
          form={viewerForm}
          enableVisualization
          features={{
            ...viewerFeatures,
            colorBy: false,
            nodesTable: false,
            electrodes: false,
            // Hover highlight is pointless with a single neuron.
            cellHover: false,
          }}
          defaultNeuronOpacity={defaultNeuronOpacity}
        />
      ))
      // Single / pair / small share CircuitPreview + MorphoViewerSmallCircuit, all served
      // by OBI-One `/circuit/viz`.
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
            form={viewerForm}
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
          form={viewerForm}
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
