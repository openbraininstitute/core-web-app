import { useMemo, useReducer } from 'react';
import { match } from 'ts-pattern';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TActivityCustomFile } from '@/features/scan-config/types';

export const TaskTabActionDict = {
  CampaignChanged: 'campaign-changed',
  ActiveConfigChanged: 'active-config-changed',
  SelectedFileChanged: 'selected-file-changed',
  ConfigCheckedChanged: 'config-checked-changed',
  SelectAllToggled: 'select-all-toggled',
  ExecutionLoaded: 'execution-loaded',
  Launched: 'launched',
} as const;

export interface ITaskTabState<M extends Record<string, unknown>> {
  campaignId: string;
  /** `null` means the user has not touched the selection yet, so all selectable configs are auto-selected. */
  selectedConfigIds: string[] | null;
  activeConfig: ITaskConfig<M> | null;
  selectedFile: TActivityCustomFile | undefined;
  executionByConfigId: Map<string, ITaskActivity | null>;
}

export type TTaskTabAction<M extends Record<string, unknown>> =
  | { type: typeof TaskTabActionDict.CampaignChanged; campaignId: string }
  | { type: typeof TaskTabActionDict.ActiveConfigChanged; config: ITaskConfig<M> }
  | { type: typeof TaskTabActionDict.SelectedFileChanged; file: TActivityCustomFile | undefined }
  | {
      type: typeof TaskTabActionDict.ConfigCheckedChanged;
      configId: string;
      checked: boolean;
      /** The selection currently on screen, so a first edit starts from what the user sees. */
      shownSelectedConfigIds: string[];
    }
  | {
      type: typeof TaskTabActionDict.SelectAllToggled;
      checked: boolean;
      selectableConfigIds: string[];
    }
  | {
      type: typeof TaskTabActionDict.ExecutionLoaded;
      configId: string;
      execution: ITaskActivity | null;
    }
  | { type: typeof TaskTabActionDict.Launched };

export function initialTaskTabState<M extends Record<string, unknown>>(
  campaignId: string
): ITaskTabState<M> {
  return {
    campaignId,
    selectedConfigIds: null,
    activeConfig: null,
    selectedFile: undefined,
    executionByConfigId: new Map(),
  };
}

export function taskTabStateReducer<M extends Record<string, unknown>>(
  state: ITaskTabState<M>,
  action: TTaskTabAction<M>
): ITaskTabState<M> {
  return match(action)
    .with({ type: TaskTabActionDict.CampaignChanged }, ({ campaignId }) =>
      state.campaignId === campaignId ? state : initialTaskTabState<M>(campaignId)
    )
    .with({ type: TaskTabActionDict.ActiveConfigChanged }, ({ config }) =>
      state.activeConfig?.id === config.id ? state : { ...state, activeConfig: config }
    )
    .with({ type: TaskTabActionDict.SelectedFileChanged }, ({ file }) => ({
      ...state,
      selectedFile: file,
    }))
    .with(
      { type: TaskTabActionDict.ConfigCheckedChanged, checked: true },
      ({ configId, shownSelectedConfigIds }) => {
        const current = state.selectedConfigIds ?? shownSelectedConfigIds;
        if (current.includes(configId)) return state;
        return { ...state, selectedConfigIds: [...current, configId] };
      }
    )
    .with(
      { type: TaskTabActionDict.ConfigCheckedChanged, checked: false },
      ({ configId, shownSelectedConfigIds }) => ({
        ...state,
        selectedConfigIds: (state.selectedConfigIds ?? shownSelectedConfigIds).filter(
          (id) => id !== configId
        ),
      })
    )
    .with({ type: TaskTabActionDict.SelectAllToggled }, ({ checked, selectableConfigIds }) => ({
      ...state,
      selectedConfigIds: checked ? selectableConfigIds : [],
    }))
    .with({ type: TaskTabActionDict.ExecutionLoaded }, ({ configId, execution }) => {
      if (state.executionByConfigId.get(configId) === execution) return state;
      const executionByConfigId = new Map(state.executionByConfigId);
      executionByConfigId.set(configId, execution);
      return { ...state, executionByConfigId };
    })
    .with({ type: TaskTabActionDict.Launched }, () => ({ ...state, selectedConfigIds: [] }))
    .exhaustive();
}

/** A config can be launched while it has no execution yet, or its last one is done or failed. */
export function isConfigSelectable(execution: ITaskActivity | null | undefined): boolean {
  const status = execution?.status;
  return !status || status === ActivityStatus.CREATED || status === ActivityStatus.ERROR;
}

export interface ITaskTabStateActions<M extends Record<string, unknown>> {
  onActiveConfigChange: (config: ITaskConfig<M>) => void;
  onSelectedFileChange: (file: TActivityCustomFile | undefined) => void;
  onCheckedChange: (configId: string, checked: boolean, shownSelectedConfigIds: string[]) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onExecutionLoad: (configId: string, execution: ITaskActivity | null) => void;
  onLaunched: () => void;
}

export interface ITaskTabStateResult<M extends Record<string, unknown>> {
  state: ITaskTabState<M>;
  act: ITaskTabStateActions<M>;
  /** Configs the user is allowed to launch, given the executions loaded so far. */
  selectableConfigIds: string[];
  /** The selection to render: the user's own, or every selectable config before they touch it. */
  resolvedSelectedConfigIds: string[];
}

export function useTaskTabState<M extends Record<string, unknown>>(
  campaignId: string,
  configs: ITaskConfig<M>[]
): ITaskTabStateResult<M> {
  const [state, dispatch] = useReducer(taskTabStateReducer<M>, campaignId, initialTaskTabState<M>);

  if (state.campaignId !== campaignId) {
    dispatch({ type: TaskTabActionDict.CampaignChanged, campaignId });
  }

  const { executionByConfigId, selectedConfigIds } = state;

  const selectableConfigIds = useMemo(
    () =>
      configs
        .filter(
          (config) =>
            executionByConfigId.has(config.id) &&
            isConfigSelectable(executionByConfigId.get(config.id))
        )
        .map((config) => config.id),
    [configs, executionByConfigId]
  );

  const allConfigStatusesLoaded =
    configs.length > 0 && configs.every((config) => executionByConfigId.has(config.id));

  const resolvedSelectedConfigIds =
    selectedConfigIds ?? (allConfigStatusesLoaded ? selectableConfigIds : []);

  const act = useMemo<ITaskTabStateActions<M>>(
    () => ({
      onActiveConfigChange: (config) =>
        dispatch({ type: TaskTabActionDict.ActiveConfigChanged, config }),
      onSelectedFileChange: (file) =>
        dispatch({ type: TaskTabActionDict.SelectedFileChanged, file }),
      onCheckedChange: (configId, checked, shownSelectedConfigIds) =>
        dispatch({
          type: TaskTabActionDict.ConfigCheckedChanged,
          configId,
          checked,
          shownSelectedConfigIds,
        }),
      onToggleSelectAll: (checked) =>
        dispatch({ type: TaskTabActionDict.SelectAllToggled, checked, selectableConfigIds }),
      onExecutionLoad: (configId, execution) =>
        dispatch({ type: TaskTabActionDict.ExecutionLoaded, configId, execution }),
      onLaunched: () => dispatch({ type: TaskTabActionDict.Launched }),
    }),
    [selectableConfigIds]
  );

  return { state, act, selectableConfigIds, resolvedSelectedConfigIds };
}
