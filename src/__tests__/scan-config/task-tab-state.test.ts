import { describe, expect, it } from 'vitest';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  initialTaskTabState,
  isConfigSelectable,
  TaskTabActionDict,
  taskTabStateReducer,
} from '@/features/scan-config/components/shared/use-task-tab-state';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';

type TMeta = Record<string, unknown>;

const config = (id: string) => ({ id, name: id }) as unknown as ITaskConfig<TMeta>;
const execution = (status: ActivityStatus) => ({ status }) as unknown as ITaskActivity;

const reduce = (
  state: ReturnType<typeof initialTaskTabState<TMeta>>,
  ...actions: Parameters<typeof taskTabStateReducer<TMeta>>[1][]
) => actions.reduce(taskTabStateReducer<TMeta>, state);

describe('taskTabStateReducer', () => {
  describe('campaign changes', () => {
    it('restores the auto-select sentinel after a launch cleared the selection', () => {
      // regression: launching left `selectedConfigIds` at [], which suppressed
      // the first-load auto-selection of the next campaign's configs.
      const launched = reduce(initialTaskTabState<TMeta>('campaign-a'), {
        type: TaskTabActionDict.Launched,
      });
      expect(launched.selectedConfigIds).toEqual([]);

      const next = taskTabStateReducer(launched, {
        type: TaskTabActionDict.CampaignChanged,
        campaignId: 'campaign-b',
      });
      expect(next.selectedConfigIds).toBeNull();
    });

    it('drops the previous campaign executions, active config and selected file', () => {
      const dirty = reduce(
        initialTaskTabState<TMeta>('campaign-a'),
        { type: TaskTabActionDict.ActiveConfigChanged, config: config('c1') },
        {
          type: TaskTabActionDict.ExecutionLoaded,
          configId: 'c1',
          execution: execution(ActivityStatus.DONE),
        },
        { type: TaskTabActionDict.SelectedFileChanged, file: { id: 'f1' } as never }
      );

      const next = taskTabStateReducer(dirty, {
        type: TaskTabActionDict.CampaignChanged,
        campaignId: 'campaign-b',
      });

      expect(next).toEqual(initialTaskTabState<TMeta>('campaign-b'));
    });

    it('is a no-op when the campaign is unchanged', () => {
      const state = initialTaskTabState<TMeta>('campaign-a');
      expect(
        taskTabStateReducer(state, {
          type: TaskTabActionDict.CampaignChanged,
          campaignId: 'campaign-a',
        })
      ).toBe(state);
    });
  });

  describe('selection', () => {
    it('starts a selection from the sentinel without losing the checked config', () => {
      const next = taskTabStateReducer(initialTaskTabState<TMeta>('campaign-a'), {
        type: TaskTabActionDict.ConfigCheckedChanged,
        configId: 'c1',
        checked: true,
      });
      expect(next.selectedConfigIds).toEqual(['c1']);
    });

    it('does not add the same config twice', () => {
      const check = {
        type: TaskTabActionDict.ConfigCheckedChanged,
        configId: 'c1',
        checked: true,
      } as const;
      const once = taskTabStateReducer(initialTaskTabState<TMeta>('campaign-a'), check);
      expect(taskTabStateReducer(once, check)).toBe(once);
    });

    it('unchecking from the sentinel yields an explicit empty selection', () => {
      const next = taskTabStateReducer(initialTaskTabState<TMeta>('campaign-a'), {
        type: TaskTabActionDict.ConfigCheckedChanged,
        configId: 'c1',
        checked: false,
      });
      expect(next.selectedConfigIds).toEqual([]);
    });

    it('select-all takes the selectable set, deselect-all empties it', () => {
      const state = initialTaskTabState<TMeta>('campaign-a');
      expect(
        taskTabStateReducer(state, {
          type: TaskTabActionDict.SelectAllToggled,
          checked: true,
          selectableConfigIds: ['c1', 'c2'],
        }).selectedConfigIds
      ).toEqual(['c1', 'c2']);

      expect(
        taskTabStateReducer(state, {
          type: TaskTabActionDict.SelectAllToggled,
          checked: false,
          selectableConfigIds: ['c1', 'c2'],
        }).selectedConfigIds
      ).toEqual([]);
    });
  });

  describe('executions', () => {
    it('keeps the same state when an unchanged execution is reloaded', () => {
      const exec = execution(ActivityStatus.RUNNING);
      const loaded = taskTabStateReducer(initialTaskTabState<TMeta>('campaign-a'), {
        type: TaskTabActionDict.ExecutionLoaded,
        configId: 'c1',
        execution: exec,
      });
      expect(
        taskTabStateReducer(loaded, {
          type: TaskTabActionDict.ExecutionLoaded,
          configId: 'c1',
          execution: exec,
        })
      ).toBe(loaded);
    });

    it('does not mutate the previous execution map', () => {
      const before = initialTaskTabState<TMeta>('campaign-a');
      taskTabStateReducer(before, {
        type: TaskTabActionDict.ExecutionLoaded,
        configId: 'c1',
        execution: null,
      });
      expect(before.executionByConfigId.size).toBe(0);
    });
  });
});

describe('isConfigSelectable', () => {
  it('allows configs with no execution yet, or a created or failed one', () => {
    expect(isConfigSelectable(undefined)).toBe(true);
    expect(isConfigSelectable(null)).toBe(true);
    expect(isConfigSelectable(execution(ActivityStatus.CREATED))).toBe(true);
    expect(isConfigSelectable(execution(ActivityStatus.ERROR))).toBe(true);
  });

  it('rejects configs already running or done', () => {
    expect(isConfigSelectable(execution(ActivityStatus.RUNNING))).toBe(false);
    expect(isConfigSelectable(execution(ActivityStatus.DONE))).toBe(false);
  });
});
