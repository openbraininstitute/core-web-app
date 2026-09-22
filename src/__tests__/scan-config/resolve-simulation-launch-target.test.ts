import { describe, expect, it } from 'vitest';

import {
  CircuitScaleDictionary,
  type TCircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { resolveSimulationLaunchTarget } from '@/entity-configuration/domain/simulation/utils';

type TLaunchInput = Omit<
  Parameters<typeof resolveSimulationLaunchTarget>[0],
  'smallScalesViaLaunchSystem'
>;

const memodel: TLaunchInput = {
  entityType: EntityTypeDict.Memodel,
  scale: null,
  targetSimulator: null,
};

const circuit = (
  scale: TCircuitScaleDictionary,
  targetSimulator: string | null = 'NEURON'
): TLaunchInput => ({ entityType: EntityTypeDict.Circuit, scale, targetSimulator });

const SMALL_SCALES = [
  CircuitScaleDictionary.Single,
  CircuitScaleDictionary.PairNeuron,
  CircuitScaleDictionary.SmallMicrocircuit,
];

const LARGE_SCALES = [
  CircuitScaleDictionary.Microcircuit,
  CircuitScaleDictionary.Region,
  CircuitScaleDictionary.System,
  CircuitScaleDictionary.WholeBrain,
];

const withFlag = (smallScalesViaLaunchSystem: boolean) => (input: TLaunchInput) =>
  resolveSimulationLaunchTarget({ ...input, smallScalesViaLaunchSystem });

describe('resolveSimulationLaunchTarget', () => {
  describe('with small scales on the launch system', () => {
    const resolve = withFlag(true);

    it('routes me-model campaigns to the single-neuron task type', () => {
      expect(resolve(memodel)).toEqual({
        taskType: ObiOneTaskTypeDict.SingleNeuronSimulationExecution,
        requiresOfflineTokenConsent: false,
      });
    });

    it('routes single-scale circuits to the synaptome task type', () => {
      expect(resolve(circuit(CircuitScaleDictionary.Single))).toEqual({
        taskType: ObiOneTaskTypeDict.SingleNeuronSynaptomeSimulationExecution,
        requiresOfflineTokenConsent: false,
      });
    });

    it('routes pair and small microcircuits to the generic circuit task', () => {
      for (const scale of [
        CircuitScaleDictionary.PairNeuron,
        CircuitScaleDictionary.SmallMicrocircuit,
      ]) {
        expect(resolve(circuit(scale))).toEqual({
          taskType: ObiOneTaskTypeDict.CircuitSimulation,
          requiresOfflineTokenConsent: false,
        });
      }
    });

    it('prefers the me-model branch even when a scale is somehow present', () => {
      expect(
        resolve({ ...memodel, scale: CircuitScaleDictionary.Single, targetSimulator: 'Brian2' })
          ?.taskType
      ).toBe(ObiOneTaskTypeDict.SingleNeuronSimulationExecution);
    });
  });

  describe('with small scales on the small-scale simulator', () => {
    const resolve = withFlag(false);

    it('leaves me-model campaigns to the small-scale simulator', () => {
      expect(resolve(memodel)).toBeNull();
    });

    it('leaves single, pair and small microcircuits to the small-scale simulator', () => {
      for (const scale of SMALL_SCALES) {
        expect(resolve(circuit(scale))).toBeNull();
      }
    });
  });

  describe.each([true, false])('with smallScalesViaLaunchSystem=%s', (flag) => {
    const resolve = withFlag(flag);

    it('launches the larger NEURON scales on the generic circuit task, asking for consent', () => {
      for (const scale of LARGE_SCALES) {
        expect(resolve(circuit(scale))).toEqual({
          taskType: ObiOneTaskTypeDict.CircuitSimulation,
          requiresOfflineTokenConsent: true,
        });
      }
    });

    it('picks the simulator over the scale for Brian2 and LearningEngine, asking for consent', () => {
      for (const scale of [...SMALL_SCALES, ...LARGE_SCALES]) {
        expect(resolve(circuit(scale, 'Brian2'))).toEqual({
          taskType: ObiOneTaskTypeDict.CircuitSimulationBrian2,
          requiresOfflineTokenConsent: true,
        });
        expect(resolve(circuit(scale, 'LearningEngine'))).toEqual({
          taskType: ObiOneTaskTypeDict.CircuitSimulation,
          requiresOfflineTokenConsent: true,
        });
      }
    });

    it('returns null for ion-channel campaigns', () => {
      expect(
        resolve({ entityType: EntityTypeDict.IonChannelModel, scale: null, targetSimulator: null })
      ).toBeNull();
    });
  });
});
