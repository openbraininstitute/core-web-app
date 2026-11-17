import { describe, expect, it, vi } from 'vitest';

import { runTask } from '@/api/one/runner';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';

import { pickLauncher } from './mutations';

vi.mock('@/api/one/runner', () => ({ runTask: vi.fn() }));
vi.mock('@/api/small-scale-simulator/task-config', () => ({
  taskConfigRunner: (path: string) => Object.assign(vi.fn(), { path }),
}));

describe('pickLauncher', () => {
  it('sends ion channel fitting to the simulator', () => {
    expect(pickLauncher(ObiOneTaskTypeDict.IonChannelFitting)).toHaveProperty(
      'path',
      '/ion-channel/build/run'
    );
  });

  it('sends ME-model builds and other task types to the launch system', () => {
    expect(pickLauncher(ObiOneTaskTypeDict.MEModelBuild)).toBe(runTask);
    expect(pickLauncher(ObiOneTaskTypeDict.SingleNeuronSimulationExecution)).toBe(runTask);
  });
});
