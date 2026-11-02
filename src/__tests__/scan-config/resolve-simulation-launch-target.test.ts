import { describe, expect, it } from 'vitest';

import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { resolveSimulationLaunchTarget } from '@/entity-configuration/domain/simulation/utils';

type TLaunchInput = Parameters<typeof resolveSimulationLaunchTarget>[0];

const memodel: TLaunchInput = {
  entityType: EntityTypeDict.Memodel,
  scale: null,
  targetSimulator: null,
};

const circuit = (
  scale: TCircuitScaleDictionary,
  targetSimulator: string | null = 'NEURON'
): TLaunchInput => ({ entityType: EntityTypeDict.Circuit, scale, targetSimulator });

describe('resolveSimulationLaunchTarget', () => {
  it('routes me-model campaigns to the single-neuron task type', () => {
    expect(resolveSimulationLaunchTarget(memodel)).toEqual({
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

  it('routes pair and small microcircuits to the generic circuit task', () => {
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

  it('prefers the me-model branch even when a scale is somehow present', () => {
    expect(
      resolveSimulationLaunchTarget({
        ...memodel,
        scale: CircuitScaleDictionary.Single,
        targetSimulator: 'Brian2',
      })?.taskType
    ).toBe(ObiOneTaskTypeDict.SingleNeuronSimulationExecution);
  });

  it('launches the larger NEURON scales on the generic circuit task, asking for consent', () => {
    for (const scale of [
      CircuitScaleDictionary.Microcircuit,
      CircuitScaleDictionary.Region,
      CircuitScaleDictionary.System,
      CircuitScaleDictionary.WholeBrain,
    ]) {
      expect(resolveSimulationLaunchTarget(circuit(scale))).toEqual({
        taskType: ObiOneTaskTypeDict.CircuitSimulation,
        requiresOfflineTokenConsent: true,
      });
    }
  });

  it('picks the simulator over the scale for Brian2 and LearningEngine, asking for consent', () => {
    for (const scale of Object.values(CircuitScaleDictionary)) {
      expect(resolveSimulationLaunchTarget(circuit(scale, 'Brian2'))).toEqual({
        taskType: ObiOneTaskTypeDict.CircuitSimulationBrian2,
        requiresOfflineTokenConsent: true,
      });
      expect(resolveSimulationLaunchTarget(circuit(scale, 'LearningEngine'))).toEqual({
        taskType: ObiOneTaskTypeDict.CircuitSimulation,
        requiresOfflineTokenConsent: true,
      });
    }
  });

  it('returns null for a circuit with a null or unknown scale', () => {
    for (const scale of [null, 'unknown' as TCircuitScaleDictionary]) {
      expect(
        resolveSimulationLaunchTarget({
          entityType: EntityTypeDict.Circuit,
          scale,
          targetSimulator: 'NEURON',
        })
      ).toBeNull();
    }
  });

  it('returns null for ion-channel campaigns', () => {
    expect(
      resolveSimulationLaunchTarget({
        entityType: EntityTypeDict.IonChannelModel,
        scale: null,
        targetSimulator: null,
      })
    ).toBeNull();
  });
});
