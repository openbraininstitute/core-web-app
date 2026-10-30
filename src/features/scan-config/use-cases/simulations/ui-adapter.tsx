/**
 * This file will be removed once we migrate the simulations to the new task runner
 * this is used to unify the ui with the extraction/skeletonization tasks that are already using the new task runner
 */

import { RiArrowRightSLine } from '@remixicon/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from 'antd';
import { useEffect } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { statusById as getSimulationStatusById } from '@/entity-configuration/domain/simulation/simulation-campaign';
import { hasSimConfigAsset } from '@/entity-configuration/domain/simulation/utils';
import { ScanParams } from '@/features/scan-config/components/scan-params';
import { ResultsLayout } from '@/features/scan-config/components/shared/results-layout';
import {
  StatusBadge,
  StatusBadgeSkeleton,
} from '@/features/scan-config/components/shared/status-badge';
import { SelectAllCheckbox } from '@/features/scan-config/components/shared/task-config-selection-list';
import { TaskLaunchButton } from '@/features/scan-config/components/shared/task-launch-button';
import { WorkflowItemCopyIdButton } from '@/features/scan-config/components/shared/workflow-item-copy-id-button';
import {
  ConfigListCardSkeleton,
  LaunchActionSkeleton,
  SelectAllSkeleton,
} from '@/features/scan-config/components/skeletons/columns';
import { getLatestSimExecStatus } from '@/features/scan-config/components/utils';
import {
  type TSimulationProgress,
  useSimulationProgress,
} from '@/features/scan-config/use-cases/simulations/use-simulation-progress';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import {
  LEGACY_SIMULATION_STATUS_QUERY_KEY_HEAD,
  TASK_STATUS_POLL_INTERVAL_MS,
  TASK_STATUS_QUERY_KEY_HEAD,
} from '@/features/task-runner/constants';
import { useBalanceRefreshOnTaskCompletion } from '@/features/task-runner/hooks/use-balance-refresh';
import { cn } from '@/utils/css-class';

import type { CSSProperties, ReactNode } from 'react';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  campaignId: string;
  loading: boolean;
  simulations: ISimulation[];
  activeSimulationId?: string;
  selectedSimulationIds: string[];
  selectableSimulationIds: string[];
  simRequestInProgress: boolean;
  context: WorkspaceContext;
  statusMap: Map<string, ActivityStatus>;
  /** The launch-system jobs of the simulations launched from this page. */
  jobIdBySimulationId?: Map<string, string>;
  launchSimBtnLabelPrefix: string;
  onToggleSelectAll: (checked: boolean) => void;
  onActiveSimulationChange: (simulation: ISimulation) => void;
  onSelectedForSimChange: (simulationId: string, selected: boolean) => void;
  onSimulationStatusLoad: (simulationId: string, status: ActivityStatus) => void;
  onRun: (simulationIds: string[]) => void;
  middle: ReactNode;
  right: ReactNode;
  /** Picks the simulation by its scan parameters, where the list is out of view. */
  simulationPicker?: ReactNode;
  /** Beside it, switches between the simulation's reports, where the files column is out of view. */
  reportPicker?: ReactNode;
};

export function SimulationsResultsUiAdapter({
  campaignId,
  loading,
  simulations,
  activeSimulationId,
  selectedSimulationIds,
  selectableSimulationIds,
  simRequestInProgress,
  context,
  statusMap,
  jobIdBySimulationId,
  launchSimBtnLabelPrefix,
  onToggleSelectAll,
  onActiveSimulationChange,
  onSelectedForSimChange,
  onSimulationStatusLoad,
  onRun,
  middle,
  right,
  simulationPicker,
  reportPicker,
}: Props) {
  return (
    <ResultsLayout
      campaignId={campaignId}
      // With a side panel up the list is out of view, so the bar over it picks the simulation.
      sidePanelBar={simulationPicker}
      sidePanelReport={reportPicker}
      left={
        // The launch button's foot level with the boxes beside it, as the configuration's is.
        <div className="flex h-full w-full flex-col gap-4 overflow-y-hidden pb-3">
          {loading ? (
            <SelectAllSkeleton />
          ) : (
            <SelectAllCheckbox
              selectedCount={selectedSimulationIds.length}
              selectableCount={selectableSimulationIds.length}
              disabled={simRequestInProgress}
              onToggleSelectAll={onToggleSelectAll}
            />
          )}
          <div className="flex grow w-full flex-col justify-start gap-2 overflow-y-auto secondary-scrollbar">
            {loading ? (
              <ConfigListCardSkeleton />
            ) : (
              simulations.map((simulation) => (
                <SimulationListItem
                  key={simulation.id}
                  campaignId={campaignId}
                  context={context}
                  selected={activeSimulationId === simulation.id}
                  simulation={simulation}
                  jobId={jobIdBySimulationId?.get(simulation.id)}
                  fallbackStatus={statusMap.get(simulation.id)}
                  pauseStatusPolling={simRequestInProgress}
                  onSelect={() => onActiveSimulationChange(simulation)}
                  onSelectedForSimChange={onSelectedForSimChange}
                  onStatusLoad={onSimulationStatusLoad}
                  selectedForSim={selectedSimulationIds.includes(simulation.id)}
                  selectionForSimDisabled={simRequestInProgress}
                  canBeSelectedForSim={hasSimConfigAsset(simulation)}
                />
              ))
            )}
          </div>
          {loading ? (
            <LaunchActionSkeleton />
          ) : (
            <TaskLaunchButton
              label="Launch simulations"
              countLabel={launchSimBtnLabelPrefix}
              pending={simRequestInProgress}
              disabled={simRequestInProgress || selectedSimulationIds.length === 0}
              onClick={() => onRun(selectedSimulationIds)}
              className="rounded-full"
            />
          )}
        </div>
      }
      middle={middle}
      right={right}
    />
  );
}

/** A running simulation's status, as its task log has it. */
function progressLabel(progress: TSimulationProgress | null) {
  if (progress === null) return undefined;
  if (progress === 'initialization') return 'Running: Load Circuit';
  if (progress === 'finalizing') return 'Running: Finalizing';
  return `Running: ${progress}%`;
}

type SimulationBlockProps = {
  campaignId: string;
  context: WorkspaceContext;
  simulation: ISimulation;
  jobId?: string;
  fallbackStatus?: ActivityStatus;
  pauseStatusPolling?: boolean;
  onSelect: (simulationId: string) => void;
  selected?: boolean;
  onSelectedForSimChange: (simulationId: string, selected: boolean) => void;
  onStatusLoad: (simulationId: string, status: ActivityStatus) => void;
  selectedForSim: boolean;
  selectionForSimDisabled?: boolean;
  canBeSelectedForSim?: boolean;
};

function SimulationListItem({
  campaignId,
  context,
  simulation,
  jobId,
  fallbackStatus,
  pauseStatusPolling,
  onSelect,
  selected,
  onSelectedForSimChange,
  onStatusLoad,
  selectedForSim,
  selectionForSimDisabled,
  canBeSelectedForSim,
}: SimulationBlockProps) {
  const queryClient = useQueryClient();
  const { data: remoteStatus, isLoading } = useQuery({
    queryKey: [LEGACY_SIMULATION_STATUS_QUERY_KEY_HEAD, { context, id: simulation.id }],
    queryFn: () => getSimulationStatusById({ id: simulation.id, simulation, context }),
    enabled: Boolean(simulation.id),
    refetchInterval: (query) => {
      const status = query.state.data ?? fallbackStatus;
      const hasActive =
        status === ActivityStatus.PENDING ||
        status === ActivityStatus.RUNNING ||
        fallbackStatus === ActivityStatus.PENDING ||
        fallbackStatus === ActivityStatus.RUNNING;

      if (hasActive && !pauseStatusPolling) return TASK_STATUS_POLL_INTERVAL_MS;
      return false;
    },
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: true,
  });

  const execStatus =
    remoteStatus && fallbackStatus
      ? getLatestSimExecStatus(remoteStatus, fallbackStatus)
      : (remoteStatus ?? fallbackStatus);
  const statusLoading = isLoading && !execStatus;
  const color = executionStatusColorMap[execStatus ?? ActivityStatus.CREATED];
  const progress = useSimulationProgress({
    simulationId: simulation.id,
    jobId,
    context,
    running: execStatus === ActivityStatus.RUNNING,
  });

  useBalanceRefreshOnTaskCompletion({ status: execStatus, context });

  useEffect(() => {
    if (execStatus) {
      queryClient.invalidateQueries({
        queryKey: [TASK_STATUS_QUERY_KEY_HEAD, { campaignId, context }],
      });
      onStatusLoad(simulation.id, execStatus);
    }
  }, [execStatus, onStatusLoad, simulation.id, campaignId, context, queryClient.invalidateQueries]);

  const statusDetails = hasSimConfigAsset(simulation)
    ? undefined
    : 'There was a problem generating this simulation';

  return (
    /* biome-ignore lint/a11y/useSemanticElements: The card contains nested controls, so a button wrapper would be invalid. */
    <div
      data-testid={`scan-config-coordinate-${simulation.id}`}
      className={cn(
        'group flex-none cursor-pointer rounded-2xl border border-gray-200',
        'hover:border-gray-300 hover:border-1.5 transition-all duration-300',
        'shadow-[0_1px_1px_rgba(16,24,40,0.08)] mr-1'
      )}
      role="button"
      tabIndex={0}
      title={simulation.name}
      aria-label={simulation.name}
      onClick={() => onSelect(simulation.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(simulation.id);
        }
      }}
    >
      <div
        className={cn(
          'rounded-2xl cursor-pointer px-4 pb-4 transition-colors duration-300 group group-hover:bg-gray-50!',
          statusLoading && 'animate-pulse'
        )}
        style={
          {
            '--card-color': color,
            border: `2px solid ${selected ? color : 'transparent'}`,
            backgroundColor: selected ? `${color}0f` : 'white',
          } as CSSProperties & { '--card-color': string }
        }
      >
        <div className="mb-2 flex min-h-18 w-full items-center justify-between gap-2 py-2">
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {!execStatus ||
            ([ActivityStatus.CREATED, ActivityStatus.ERROR].includes(execStatus) &&
              canBeSelectedForSim) ? (
              <div className="flex min-w-0 items-start" style={{ maxWidth: '100%' }}>
                <Checkbox
                  className={cn(
                    'mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:max-w-full [&_.ant-checkbox+span]:break-words [&_.ant-checkbox+span]:line-clamp-3 [&_.ant-checkbox+span]:whitespace-normal',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-9! [&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-9!',
                    '[&_.ant-checkbox-indeterminate_.ant-checkbox-inner]:after:bg-primary-9!',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-9!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-9!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
                  )}
                  disabled={selectionForSimDisabled}
                  onChange={(e) => onSelectedForSimChange(simulation.id, e.target.checked)}
                  checked={selectedForSim}
                  style={{ color, maxWidth: '100%', display: 'flex' }}
                >
                  <span className="text-lg leading-6 transition-colors duration-300">
                    {simulation.name}
                  </span>
                </Checkbox>
              </div>
            ) : (
              <span
                style={{ color }}
                className="block break-words text-lg leading-6 transition-colors duration-300 line-clamp-3"
              >
                {simulation.name}
              </span>
            )}
          </div>
          <div className="ml-2 flex shrink-0 items-center justify-center gap-0.5">
            {simulation.id && (
              // Left of the status, which keeps its place beside the arrow: out of sight
              // until the card is hovered or the button is reached by keyboard, and
              // widening over the name's end, not into the status, when hovered itself.
              <div className="relative size-8 shrink-0 transition-opacity duration-200 focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
                <div className="absolute top-1/2 right-0 z-10 -translate-y-1/2">
                  <WorkflowItemCopyIdButton value={simulation.id} />
                </div>
              </div>
            )}
            {statusLoading ? (
              <StatusBadgeSkeleton />
            ) : (
              <StatusBadge
                status={execStatus}
                details={statusDetails}
                label={progressLabel(progress)}
              />
            )}
            <div className="flex items-center justify-center">
              <RiArrowRightSLine className="size-5 shrink-0 text-gray-500" />
            </div>
          </div>
        </div>

        <ScanParams scanParams={simulation.scan_parameters} color={color} />
      </div>
    </div>
  );
}
