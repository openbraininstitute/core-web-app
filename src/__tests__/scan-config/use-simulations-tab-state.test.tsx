import { act as reactAct, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { useSimulationsTabState } from '@/features/scan-config/use-cases/simulations/use-simulations-tab-state';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';

const simulation = (id: string) =>
  ({
    id,
    assets: [{ id: `${id}-asset`, label: AssetLabel.sonata_simulation_config }],
  }) as unknown as ISimulation;

const simulations = [simulation('s1'), simulation('s2')];

describe('useSimulationsTabState', () => {
  it('keeps the action handlers referentially stable across status changes', () => {
    // regression: `act` was memoized on `selectableSimulationIds`, so every status
    // write handed out fresh handlers. An effect keyed on `onActiveSimulationChange`
    // then re-ran and snapped the view back to the first simulation mid-run.
    const { result } = renderHook(() => useSimulationsTabState('campaign-a', simulations));
    const before = result.current.act;

    reactAct(() => {
      result.current.act.onSimulationStatusLoad('s1', ActivityStatus.CREATED);
    });
    reactAct(() => {
      result.current.act.onSimulationStatusLoad('s1', ActivityStatus.RUNNING);
    });

    expect(result.current.state.statusBySimulationId.get('s1')).toBe(ActivityStatus.RUNNING);
    expect(result.current.act).toBe(before);
  });

  it('auto-selects created simulations only once every status has loaded', () => {
    const { result } = renderHook(() => useSimulationsTabState('campaign-a', simulations));

    reactAct(() => {
      result.current.act.onSimulationStatusLoad('s1', ActivityStatus.CREATED);
    });
    // s2 has no status yet, so nothing is auto-selected
    expect(result.current.resolvedSelectedSimulationIds).toEqual([]);

    reactAct(() => {
      result.current.act.onSimulationStatusLoad('s2', ActivityStatus.CREATED);
    });
    expect(result.current.resolvedSelectedSimulationIds).toEqual(['s1', 's2']);
  });

  it('excludes failed simulations from the auto-selection but keeps them selectable', () => {
    const { result } = renderHook(() => useSimulationsTabState('campaign-a', simulations));

    reactAct(() => {
      result.current.act.onSimulationStatusLoad('s1', ActivityStatus.CREATED);
      result.current.act.onSimulationStatusLoad('s2', ActivityStatus.ERROR);
    });

    expect(result.current.resolvedSelectedSimulationIds).toEqual(['s1']);
    expect(result.current.selectableSimulationIds).toEqual(['s1', 's2']);
  });

  it('unchecking one auto-selected card leaves the rest checked', () => {
    // regression seen in the UI: unchecking a single card cleared every checkbox,
    // because the first edit started from [] rather than the shown selection.
    const { result } = renderHook(() => useSimulationsTabState('campaign-a', simulations));

    reactAct(() => {
      result.current.act.onSimulationStatusLoad('s1', ActivityStatus.CREATED);
      result.current.act.onSimulationStatusLoad('s2', ActivityStatus.CREATED);
    });
    expect(result.current.resolvedSelectedSimulationIds).toEqual(['s1', 's2']);

    reactAct(() => {
      result.current.act.onSelectedForSimChange(
        's1',
        false,
        result.current.resolvedSelectedSimulationIds
      );
    });

    expect(result.current.resolvedSelectedSimulationIds).toEqual(['s2']);
  });

  it('re-arms the auto-selection when the campaign changes after a launch', () => {
    const { result, rerender } = renderHook(
      ({ campaignId }) => useSimulationsTabState(campaignId, simulations),
      { initialProps: { campaignId: 'campaign-a' } }
    );

    reactAct(() => {
      result.current.act.onSimulationStatusLoad('s1', ActivityStatus.CREATED);
      result.current.act.onSimulationStatusLoad('s2', ActivityStatus.CREATED);
    });
    expect(result.current.resolvedSelectedSimulationIds).toEqual(['s1', 's2']);

    reactAct(() => {
      result.current.act.onLaunched();
    });
    expect(result.current.resolvedSelectedSimulationIds).toEqual([]);

    rerender({ campaignId: 'campaign-b' });
    expect(result.current.state.selectedSimulationIds).toBeNull();
    expect(result.current.state.statusBySimulationId.size).toBe(0);
  });
});
