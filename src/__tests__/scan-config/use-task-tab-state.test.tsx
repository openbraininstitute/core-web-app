import { act as reactAct, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { useTaskTabState } from '@/features/scan-config/components/shared/use-task-tab-state';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';

type TMeta = Record<string, unknown>;

const config = (id: string) => ({ id, name: id }) as unknown as ITaskConfig<TMeta>;
const execution = (status: ActivityStatus) => ({ status }) as unknown as ITaskActivity;

const configs = [config('c1'), config('c2')];

const loadCreatedExecutions = (act: ReturnType<typeof useTaskTabState<TMeta>>['act']) => {
  act.onExecutionLoad('c1', execution(ActivityStatus.CREATED));
  act.onExecutionLoad('c2', execution(ActivityStatus.CREATED));
};

describe('useTaskTabState', () => {
  it('keeps the action handlers referentially stable across execution loads', () => {
    // the handlers are passed straight to children and may be keyed on by effects,
    // so a fresh `act` on every status load would re-trigger that work.
    const { result } = renderHook(() => useTaskTabState<TMeta>('campaign-a', configs));
    const before = result.current.act;

    reactAct(() => loadCreatedExecutions(result.current.act));
    reactAct(() => {
      result.current.act.onExecutionLoad('c1', execution(ActivityStatus.RUNNING));
    });

    expect(result.current.state.executionByConfigId.get('c1')?.status).toBe(ActivityStatus.RUNNING);
    expect(result.current.act).toBe(before);
  });

  it('auto-selects every selectable config once all executions have loaded', () => {
    const { result } = renderHook(() => useTaskTabState<TMeta>('campaign-a', configs));

    reactAct(() => {
      result.current.act.onExecutionLoad('c1', execution(ActivityStatus.CREATED));
    });
    // c2 has no execution yet, so nothing is auto-selected
    expect(result.current.resolvedSelectedConfigIds).toEqual([]);

    reactAct(() => {
      result.current.act.onExecutionLoad('c2', execution(ActivityStatus.CREATED));
    });
    expect(result.current.resolvedSelectedConfigIds).toEqual(['c1', 'c2']);
  });

  it('unchecking one auto-selected card leaves the rest checked', () => {
    // regression seen in the UI: unchecking a single card cleared every checkbox.
    const { result } = renderHook(() => useTaskTabState<TMeta>('campaign-a', configs));

    reactAct(() => loadCreatedExecutions(result.current.act));
    expect(result.current.resolvedSelectedConfigIds).toEqual(['c1', 'c2']);

    reactAct(() => {
      result.current.act.onCheckedChange('c1', false);
    });
    expect(result.current.resolvedSelectedConfigIds).toEqual(['c2']);
  });

  it('select-all re-checks everything selectable after a deselect-all', () => {
    const { result } = renderHook(() => useTaskTabState<TMeta>('campaign-a', configs));

    reactAct(() => loadCreatedExecutions(result.current.act));

    reactAct(() => {
      result.current.act.onToggleSelectAll(false);
    });
    expect(result.current.resolvedSelectedConfigIds).toEqual([]);

    reactAct(() => {
      result.current.act.onToggleSelectAll(true);
    });
    expect(result.current.resolvedSelectedConfigIds).toEqual(['c1', 'c2']);
  });

  it('re-arms the auto-selection when the campaign changes after a launch', () => {
    const { result, rerender } = renderHook(
      ({ campaignId }) => useTaskTabState<TMeta>(campaignId, configs),
      { initialProps: { campaignId: 'campaign-a' } }
    );

    reactAct(() => loadCreatedExecutions(result.current.act));
    reactAct(() => {
      result.current.act.onLaunched();
    });
    expect(result.current.resolvedSelectedConfigIds).toEqual([]);

    rerender({ campaignId: 'campaign-b' });
    expect(result.current.state.selectedConfigIds).toBeNull();
    expect(result.current.state.executionByConfigId.size).toBe(0);
  });
});
