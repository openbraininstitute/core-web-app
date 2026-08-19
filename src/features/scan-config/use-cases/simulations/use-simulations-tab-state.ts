import { useMemo, useReducer } from 'react';
import { match } from 'ts-pattern';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { hasSimConfigAsset } from '@/entity-configuration/domain/simulation/utils';
import { getLatestSimExecStatus } from '@/features/scan-config/components/utils';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { TActivityCustomFile } from '@/features/scan-config/types';

export const SimulationsTabActionDict = {
  CampaignChanged: 'campaign-changed',
  ActiveSimulationChanged: 'active-simulation-changed',
  SelectedFileChanged: 'selected-file-changed',
  SimulationCheckedChanged: 'simulation-checked-changed',
  SelectAllToggled: 'select-all-toggled',
  StatusSet: 'status-set',
  StatusLoaded: 'status-loaded',
  JobIdAssigned: 'job-id-assigned',
  Launched: 'launched',
} as const;

/**
 * Every field is campaign-scoped: it is meaningless once `campaignId` changes.
 * `campaignId` lives inside the state so that reset is a single transition
 * instead of several setters that can drift apart.
 */
export interface ISimulationsTabState {
  campaignId: string;
  /** `null` means the user has not touched the selection yet, so launchable simulations are auto-selected. */
  selectedSimulationIds: string[] | null;
  activeSimulation: ISimulation | null;
  selectedFile: TActivityCustomFile | undefined;
  statusBySimulationId: Map<string, ActivityStatus>;
  jobIdBySimulationId: Map<string, string>;
}

export type TSimulationsTabAction =
  | { type: typeof SimulationsTabActionDict.CampaignChanged; campaignId: string }
  | { type: typeof SimulationsTabActionDict.ActiveSimulationChanged; simulation: ISimulation }
  | {
      type: typeof SimulationsTabActionDict.SelectedFileChanged;
      file: TActivityCustomFile | undefined;
    }
  | {
      type: typeof SimulationsTabActionDict.SimulationCheckedChanged;
      simulationId: string;
      checked: boolean;
    }
  | {
      type: typeof SimulationsTabActionDict.SelectAllToggled;
      checked: boolean;
      selectableSimulationIds: string[];
    }
  /** Authoritative write: an optimistic launch status or a status pushed by the launch stream. */
  | {
      type: typeof SimulationsTabActionDict.StatusSet;
      simulationId: string;
      status: ActivityStatus;
    }
  /** Polled write: kept only if it is newer than the status already held. */
  | {
      type: typeof SimulationsTabActionDict.StatusLoaded;
      simulationId: string;
      status: ActivityStatus;
    }
  | { type: typeof SimulationsTabActionDict.JobIdAssigned; simulationId: string; jobId: string }
  | { type: typeof SimulationsTabActionDict.Launched };

export function initialSimulationsTabState(campaignId: string): ISimulationsTabState {
  return {
    campaignId,
    selectedSimulationIds: null,
    activeSimulation: null,
    selectedFile: undefined,
    statusBySimulationId: new Map(),
    jobIdBySimulationId: new Map(),
  };
}

function withStatus(
  state: ISimulationsTabState,
  simulationId: string,
  status: ActivityStatus
): ISimulationsTabState {
  const statusBySimulationId = new Map(state.statusBySimulationId);
  statusBySimulationId.set(simulationId, status);
  return { ...state, statusBySimulationId };
}

export function simulationsTabStateReducer(
  state: ISimulationsTabState,
  action: TSimulationsTabAction
): ISimulationsTabState {
  return match(action)
    .with({ type: SimulationsTabActionDict.CampaignChanged }, ({ campaignId }) =>
      state.campaignId === campaignId ? state : initialSimulationsTabState(campaignId)
    )
    .with({ type: SimulationsTabActionDict.ActiveSimulationChanged }, ({ simulation }) =>
      state.activeSimulation?.id === simulation.id
        ? state
        : { ...state, activeSimulation: simulation }
    )
    .with({ type: SimulationsTabActionDict.SelectedFileChanged }, ({ file }) => ({
      ...state,
      selectedFile: file,
    }))
    .with(
      { type: SimulationsTabActionDict.SimulationCheckedChanged, checked: true },
      ({ simulationId }) => {
        const current = state.selectedSimulationIds ?? [];
        if (current.includes(simulationId)) return state;
        return { ...state, selectedSimulationIds: [...current, simulationId] };
      }
    )
    .with(
      { type: SimulationsTabActionDict.SimulationCheckedChanged, checked: false },
      ({ simulationId }) => ({
        ...state,
        selectedSimulationIds: (state.selectedSimulationIds ?? []).filter(
          (id) => id !== simulationId
        ),
      })
    )
    .with(
      { type: SimulationsTabActionDict.SelectAllToggled },
      ({ checked, selectableSimulationIds }) => ({
        ...state,
        selectedSimulationIds: checked ? selectableSimulationIds : [],
      })
    )
    .with({ type: SimulationsTabActionDict.StatusSet }, ({ simulationId, status }) =>
      state.statusBySimulationId.get(simulationId) === status
        ? state
        : withStatus(state, simulationId, status)
    )
    .with({ type: SimulationsTabActionDict.StatusLoaded }, ({ simulationId, status }) => {
      const previous = state.statusBySimulationId.get(simulationId);
      if (previous === status) return state;
      return withStatus(
        state,
        simulationId,
        previous ? getLatestSimExecStatus(status, previous) : status
      );
    })
    .with({ type: SimulationsTabActionDict.JobIdAssigned }, ({ simulationId, jobId }) => {
      if (state.jobIdBySimulationId.get(simulationId) === jobId) return state;
      const jobIdBySimulationId = new Map(state.jobIdBySimulationId);
      jobIdBySimulationId.set(simulationId, jobId);
      return { ...state, jobIdBySimulationId };
    })
    .with({ type: SimulationsTabActionDict.Launched }, () => ({
      ...state,
      selectedSimulationIds: [],
    }))
    .exhaustive();
}

/** A simulation can be launched when it is fresh or previously failed, and carries a config to run. */
export function isSimulationSelectable(
  simulation: ISimulation,
  status: ActivityStatus | undefined
): boolean {
  const launchable = status === ActivityStatus.CREATED || status === ActivityStatus.ERROR;
  return launchable && hasSimConfigAsset(simulation);
}

export interface ISimulationsTabStateActions {
  onActiveSimulationChange: (simulation: ISimulation) => void;
  onSelectedFileChange: (file: TActivityCustomFile | undefined) => void;
  onSelectedForSimChange: (simulationId: string, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  setSimulationStatus: (simulationId: string, status: ActivityStatus) => void;
  onSimulationStatusLoad: (simulationId: string, status: ActivityStatus) => void;
  setSimulationJobId: (simulationId: string, jobId: string) => void;
  onLaunched: () => void;
}

export interface ISimulationsTabStateResult {
  state: ISimulationsTabState;
  act: ISimulationsTabStateActions;
  /** Simulations the user is allowed to launch, given the statuses loaded so far. */
  selectableSimulationIds: string[];
  /** The selection to render: the user's own, or the auto-selection before they touch it. */
  resolvedSelectedSimulationIds: string[];
}

/**
 * Single owner of the campaign-scoped state for the simulations result tab. The
 * tab is not remounted when the campaign changes, so the state is reset during
 * render off `campaignId`.
 */
export function useSimulationsTabState(
  campaignId: string,
  simulations: ISimulation[]
): ISimulationsTabStateResult {
  const [state, dispatch] = useReducer(
    simulationsTabStateReducer,
    campaignId,
    initialSimulationsTabState
  );

  if (state.campaignId !== campaignId) {
    dispatch({ type: SimulationsTabActionDict.CampaignChanged, campaignId });
  }

  const { statusBySimulationId, selectedSimulationIds } = state;

  const selectableSimulationIds = useMemo(
    () =>
      simulations
        .filter((simulation) =>
          isSimulationSelectable(simulation, statusBySimulationId.get(simulation.id))
        )
        .map((simulation) => simulation.id),
    [simulations, statusBySimulationId]
  );

  // Only freshly created simulations are auto-selected. A previously failed one
  // stays selectable, but has to be re-selected by hand.
  const autoSelectedSimulationIds = useMemo(
    () =>
      simulations
        .filter(
          (simulation) =>
            statusBySimulationId.get(simulation.id) === ActivityStatus.CREATED &&
            hasSimConfigAsset(simulation)
        )
        .map((simulation) => simulation.id),
    [simulations, statusBySimulationId]
  );

  const allStatusesLoaded =
    simulations.length > 0 &&
    simulations.every((simulation) => statusBySimulationId.has(simulation.id));

  const resolvedSelectedSimulationIds =
    selectedSimulationIds ?? (allStatusesLoaded ? autoSelectedSimulationIds : []);

  const act = useMemo<ISimulationsTabStateActions>(
    () => ({
      onActiveSimulationChange: (simulation) =>
        dispatch({ type: SimulationsTabActionDict.ActiveSimulationChanged, simulation }),
      onSelectedFileChange: (file) =>
        dispatch({ type: SimulationsTabActionDict.SelectedFileChanged, file }),
      onSelectedForSimChange: (simulationId, checked) =>
        dispatch({
          type: SimulationsTabActionDict.SimulationCheckedChanged,
          simulationId,
          checked,
        }),
      onToggleSelectAll: (checked) =>
        dispatch({
          type: SimulationsTabActionDict.SelectAllToggled,
          checked,
          selectableSimulationIds,
        }),
      setSimulationStatus: (simulationId, status) =>
        dispatch({ type: SimulationsTabActionDict.StatusSet, simulationId, status }),
      onSimulationStatusLoad: (simulationId, status) =>
        dispatch({ type: SimulationsTabActionDict.StatusLoaded, simulationId, status }),
      setSimulationJobId: (simulationId, jobId) =>
        dispatch({ type: SimulationsTabActionDict.JobIdAssigned, simulationId, jobId }),
      onLaunched: () => dispatch({ type: SimulationsTabActionDict.Launched }),
    }),
    [selectableSimulationIds]
  );

  return { state, act, selectableSimulationIds, resolvedSelectedSimulationIds };
}
