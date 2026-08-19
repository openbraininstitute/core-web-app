import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  initialSimulationsTabState,
  isSimulationSelectable,
  SimulationsTabActionDict,
  simulationsTabStateReducer,
} from '@/features/scan-config/use-cases/simulations/use-simulations-tab-state';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';

const simulation = (id: string, withConfig = true) =>
  ({
    id,
    assets: withConfig ? [{ id: `${id}-asset`, label: AssetLabel.sonata_simulation_config }] : [],
  }) as unknown as ISimulation;

const reduce = (
  state: ISimulationsTabStateLike,
  ...actions: Parameters<typeof simulationsTabStateReducer>[1][]
) => actions.reduce(simulationsTabStateReducer, state);

type ISimulationsTabStateLike = ReturnType<typeof initialSimulationsTabState>;

describe('simulationsTabStateReducer', () => {
  describe('campaign changes', () => {
    it('restores the auto-select sentinel after a launch cleared the selection', () => {
      // regression: the old one-shot `initialSelectionDone` latch stayed consumed,
      // so a second campaign opened with every checkbox unchecked.
      const launched = reduce(initialSimulationsTabState('campaign-a'), {
        type: SimulationsTabActionDict.Launched,
      });
      expect(launched.selectedSimulationIds).toEqual([]);

      const next = simulationsTabStateReducer(launched, {
        type: SimulationsTabActionDict.CampaignChanged,
        campaignId: 'campaign-b',
      });
      expect(next.selectedSimulationIds).toBeNull();
    });

    it('drops the previous campaign statuses, job ids, active simulation and file', () => {
      const dirty = reduce(
        initialSimulationsTabState('campaign-a'),
        { type: SimulationsTabActionDict.ActiveSimulationChanged, simulation: simulation('s1') },
        {
          type: SimulationsTabActionDict.StatusSet,
          simulationId: 's1',
          status: ActivityStatus.DONE,
        },
        { type: SimulationsTabActionDict.JobIdAssigned, simulationId: 's1', jobId: 'job-1' },
        { type: SimulationsTabActionDict.SelectedFileChanged, file: { id: 'f1' } as never }
      );

      const next = simulationsTabStateReducer(dirty, {
        type: SimulationsTabActionDict.CampaignChanged,
        campaignId: 'campaign-b',
      });

      expect(next).toEqual(initialSimulationsTabState('campaign-b'));
    });

    it('is a no-op when the campaign is unchanged', () => {
      const state = initialSimulationsTabState('campaign-a');
      expect(
        simulationsTabStateReducer(state, {
          type: SimulationsTabActionDict.CampaignChanged,
          campaignId: 'campaign-a',
        })
      ).toBe(state);
    });
  });

  describe('status writes', () => {
    it('keeps the furthest-along status when a stale poll arrives', () => {
      const launched = reduce(initialSimulationsTabState('campaign-a'), {
        type: SimulationsTabActionDict.StatusSet,
        simulationId: 's1',
        status: ActivityStatus.RUNNING,
      });

      // a poll started before the launch reports the old status
      const polled = simulationsTabStateReducer(launched, {
        type: SimulationsTabActionDict.StatusLoaded,
        simulationId: 's1',
        status: ActivityStatus.CREATED,
      });

      expect(polled.statusBySimulationId.get('s1')).toBe(ActivityStatus.RUNNING);
    });

    it('accepts a newer polled status', () => {
      const state = reduce(
        initialSimulationsTabState('campaign-a'),
        {
          type: SimulationsTabActionDict.StatusLoaded,
          simulationId: 's1',
          status: ActivityStatus.CREATED,
        },
        {
          type: SimulationsTabActionDict.StatusLoaded,
          simulationId: 's1',
          status: ActivityStatus.DONE,
        }
      );
      expect(state.statusBySimulationId.get('s1')).toBe(ActivityStatus.DONE);
    });

    it('lets an authoritative write move the status backwards', () => {
      const state = reduce(
        initialSimulationsTabState('campaign-a'),
        {
          type: SimulationsTabActionDict.StatusLoaded,
          simulationId: 's1',
          status: ActivityStatus.DONE,
        },
        {
          type: SimulationsTabActionDict.StatusSet,
          simulationId: 's1',
          status: ActivityStatus.PENDING,
        }
      );
      expect(state.statusBySimulationId.get('s1')).toBe(ActivityStatus.PENDING);
    });

    it('does not mutate the previous status map', () => {
      const before = initialSimulationsTabState('campaign-a');
      simulationsTabStateReducer(before, {
        type: SimulationsTabActionDict.StatusSet,
        simulationId: 's1',
        status: ActivityStatus.PENDING,
      });
      expect(before.statusBySimulationId.size).toBe(0);
    });
  });

  describe('selection', () => {
    it('starts a selection from the sentinel without losing the checked simulation', () => {
      const next = simulationsTabStateReducer(initialSimulationsTabState('campaign-a'), {
        type: SimulationsTabActionDict.SimulationCheckedChanged,
        simulationId: 's1',
        checked: true,
      });
      expect(next.selectedSimulationIds).toEqual(['s1']);
    });

    it('unchecking from the sentinel yields an explicit empty selection', () => {
      const next = simulationsTabStateReducer(initialSimulationsTabState('campaign-a'), {
        type: SimulationsTabActionDict.SimulationCheckedChanged,
        simulationId: 's1',
        checked: false,
      });
      expect(next.selectedSimulationIds).toEqual([]);
    });
  });
});

describe('isSimulationSelectable', () => {
  it('allows created and failed simulations that carry a config', () => {
    expect(isSimulationSelectable(simulation('s1'), ActivityStatus.CREATED)).toBe(true);
    expect(isSimulationSelectable(simulation('s1'), ActivityStatus.ERROR)).toBe(true);
  });

  it('rejects simulations without a simulation config asset', () => {
    expect(isSimulationSelectable(simulation('s1', false), ActivityStatus.CREATED)).toBe(false);
  });

  it('rejects simulations already running, done, or with no status yet', () => {
    expect(isSimulationSelectable(simulation('s1'), ActivityStatus.RUNNING)).toBe(false);
    expect(isSimulationSelectable(simulation('s1'), ActivityStatus.DONE)).toBe(false);
    expect(isSimulationSelectable(simulation('s1'), undefined)).toBe(false);
  });
});
