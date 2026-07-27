import { describe, expect, it } from 'vitest';

import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { resolveSimulationLaunchTaskType } from '@/entity-configuration/domain/simulation/utils';

const circuit = (
  scale: (typeof CircuitScaleDictionary)[keyof typeof CircuitScaleDictionary],
  targetSimulator: string | null = 'NEURON'
) => ({ entityType: EntityTypeDict.Circuit, scale, targetSimulator });

describe('resolveSimulationLaunchTaskType', () => {
  it('routes me-model campaigns to the single-neuron task type', () => {
    // "Single neuron (beta)" hangs off a me-model, so it carries neither scale nor simulator.
    expect(
      resolveSimulationLaunchTaskType({
        entityType: EntityTypeDict.Memodel,
        scale: null,
        targetSimulator: null,
      })
    ).toBe(ObiOneTaskTypeDict.SingleNeuronSimulationExecution);
  });

  it('routes single-scale circuits to the synaptome task type', () => {
    expect(resolveSimulationLaunchTaskType(circuit(CircuitScaleDictionary.Single))).toBe(
      ObiOneTaskTypeDict.SingleNeuronSynaptomeSimulationExecution
    );
  });

  it('routes pair and small microcircuits to the generic circuit task, resolved server-side', () => {
    expect(resolveSimulationLaunchTaskType(circuit(CircuitScaleDictionary.PairNeuron))).toBe(
      ObiOneTaskTypeDict.CircuitSimulation
    );
    expect(resolveSimulationLaunchTaskType(circuit(CircuitScaleDictionary.SmallMicrocircuit))).toBe(
      ObiOneTaskTypeDict.CircuitSimulation
    );
  });

  it('keeps the larger scales on the generic circuit task', () => {
    for (const scale of [
      CircuitScaleDictionary.Microcircuit,
      CircuitScaleDictionary.Region,
      CircuitScaleDictionary.System,
      CircuitScaleDictionary.WholeBrain,
    ]) {
      expect(resolveSimulationLaunchTaskType(circuit(scale))).toBe(
        ObiOneTaskTypeDict.CircuitSimulation
      );
    }
  });

  it('picks the simulator over the scale for Brian2 and LearningEngine circuits', () => {
    expect(
      resolveSimulationLaunchTaskType(circuit(CircuitScaleDictionary.WholeBrain, 'Brian2'))
    ).toBe(ObiOneTaskTypeDict.CircuitSimulationBrian2);
    expect(
      resolveSimulationLaunchTaskType(circuit(CircuitScaleDictionary.Single, 'LearningEngine'))
    ).toBe(ObiOneTaskTypeDict.CircuitSimulation);
  });

  it('prefers the me-model branch even when a scale is somehow present', () => {
    expect(
      resolveSimulationLaunchTaskType({
        entityType: EntityTypeDict.Memodel,
        scale: CircuitScaleDictionary.Single,
        targetSimulator: 'Brian2',
      })
    ).toBe(ObiOneTaskTypeDict.SingleNeuronSimulationExecution);
  });

  it('returns null for ion-channel campaigns, which still use the small-scale simulator', () => {
    expect(
      resolveSimulationLaunchTaskType({
        entityType: EntityTypeDict.IonChannelModel,
        scale: null,
        targetSimulator: null,
      })
    ).toBeNull();
  });
});
