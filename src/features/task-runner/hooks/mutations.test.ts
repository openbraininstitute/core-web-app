import { describe, expect, it, vi } from 'vitest';

import { runTask } from '@/api/one/runner';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { defaultFlags } from '@/features/feature-flags/config';
import { memodelBuildViaLaunchSystemFlag } from '@/features/feature-flags/flags';

import { pickLauncher } from './mutations';

vi.mock('@/api/one/runner', () => ({ runTask: vi.fn() }));
vi.mock('@/api/small-scale-simulator/task-config', () => ({
  taskConfigRunner: (path: string) => Object.assign(vi.fn(), { path }),
}));

const flagOn = { ...defaultFlags, [memodelBuildViaLaunchSystemFlag.key]: true };

describe('pickLauncher', () => {
  it('sends ME-model builds to the simulator when the flag is off', () => {
    expect(pickLauncher(ObiOneTaskTypeDict.MEModelBuild, defaultFlags)).toHaveProperty(
      'path',
      '/single-neuron/build/run'
    );
  });

  it('sends ME-model builds to the launch system when the flag is on', () => {
    expect(pickLauncher(ObiOneTaskTypeDict.MEModelBuild, flagOn)).toBe(runTask);
  });

  it('sends ion channel fitting to the simulator whatever the flag', () => {
    for (const flags of [defaultFlags, flagOn]) {
      expect(pickLauncher(ObiOneTaskTypeDict.IonChannelFitting, flags)).toHaveProperty(
        'path',
        '/ion-channel/build/run'
      );
    }
  });

  it('sends other task types to the launch system', () => {
    expect(pickLauncher(ObiOneTaskTypeDict.SingleNeuronSimulationExecution, defaultFlags)).toBe(
      runTask
    );
  });
});
