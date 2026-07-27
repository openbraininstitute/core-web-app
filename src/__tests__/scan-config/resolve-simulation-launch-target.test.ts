import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { resolveSimulationLaunchTarget } from '@/entity-configuration/domain/simulation/utils';

const circuit = (
  scale: (typeof CircuitScaleDictionary)[keyof typeof CircuitScaleDictionary],
  targetSimulator: string | null = 'NEURON'
) => ({ entityType: EntityTypeDict.Circuit, scale, targetSimulator });

const CLUSTER_SCALES = [
  CircuitScaleDictionary.Microcircuit,
  CircuitScaleDictionary.Region,
  CircuitScaleDictionary.System,
  CircuitScaleDictionary.WholeBrain,
];

describe('resolveSimulationLaunchTarget', () => {
  it('routes me-model campaigns to the single-neuron task type', () => {
    // "Single neuron (beta)" hangs off a me-model, so it carries neither scale nor simulator.
    expect(
      resolveSimulationLaunchTarget({
        entityType: EntityTypeDict.Memodel,
        scale: null,
        targetSimulator: null,
      })
    ).toEqual({
      taskType: ObiOneTaskTypeDict.SingleNeuronSimulationExecution,
      requiresOfflineTokenConsent: false,
    });
  });

  it('routes single-scale circuits to the synaptome task type', () => {
    expect(resolveSimulationLaunchTarget(circuit(CircuitScaleDictionary.Single))).toEqual({
      taskType: ObiOneTaskTypeDict.SingleNeuronSynaptomeSimulationExecution,
      requiresOfflineTokenConsent: false,
    });
  });

  it('routes pair and small microcircuits to the generic circuit task, resolved server-side', () => {
    for (const scale of [
      CircuitScaleDictionary.PairNeuron,
      CircuitScaleDictionary.SmallMicrocircuit,
    ]) {
      expect(resolveSimulationLaunchTarget(circuit(scale))).toEqual({
        taskType: ObiOneTaskTypeDict.CircuitSimulation,
        requiresOfflineTokenConsent: false,
      });
    }
  });

  it('keeps the larger scales on the generic circuit task', () => {
    for (const scale of CLUSTER_SCALES) {
      expect(resolveSimulationLaunchTarget(circuit(scale))?.taskType).toBe(
        ObiOneTaskTypeDict.CircuitSimulation
      );
    }
  });

  it('picks the simulator over the scale for Brian2 and LearningEngine circuits', () => {
    expect(
      resolveSimulationLaunchTarget(circuit(CircuitScaleDictionary.WholeBrain, 'Brian2'))?.taskType
    ).toBe(ObiOneTaskTypeDict.CircuitSimulationBrian2);
    expect(
      resolveSimulationLaunchTarget(circuit(CircuitScaleDictionary.Single, 'LearningEngine'))
        ?.taskType
    ).toBe(ObiOneTaskTypeDict.CircuitSimulation);
  });

  it('prefers the me-model branch even when a scale is somehow present', () => {
    expect(
      resolveSimulationLaunchTarget({
        entityType: EntityTypeDict.Memodel,
        scale: CircuitScaleDictionary.Single,
        targetSimulator: 'Brian2',
      })?.taskType
    ).toBe(ObiOneTaskTypeDict.SingleNeuronSimulationExecution);
  });

  it('returns null for ion-channel campaigns, which still use the small-scale simulator', () => {
    expect(
      resolveSimulationLaunchTarget({
        entityType: EntityTypeDict.IonChannelModel,
        scale: null,
        targetSimulator: null,
      })
    ).toBeNull();
  });

  it('requires offline-token consent only for NEURON scales above small', () => {
    for (const scale of CLUSTER_SCALES) {
      expect(resolveSimulationLaunchTarget(circuit(scale))?.requiresOfflineTokenConsent).toBe(true);
    }
  });

  it('does not require offline-token consent for simulators that never reach the cluster', () => {
    // Brian2 and LearningEngine run as machine jobs whatever the circuit scale is.
    for (const scale of CLUSTER_SCALES) {
      expect(
        resolveSimulationLaunchTarget(circuit(scale, 'Brian2'))?.requiresOfflineTokenConsent
      ).toBe(false);
      expect(
        resolveSimulationLaunchTarget(circuit(scale, 'LearningEngine'))?.requiresOfflineTokenConsent
      ).toBe(false);
    }
  });
});
