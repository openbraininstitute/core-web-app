/**
 * This file will be removed once we migrate the simulations to the new task runner
 * this is used to unify the ui with the extraction/skeletonization tasks that are already using the new task runner
 */

import { RightOutlined } from '@ant-design/icons';
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
import {
  ConfigListCardSkeleton,
  LaunchActionSkeleton,
  SelectAllSkeleton,
} from '@/features/scan-config/components/skeletons/columns';
import { getLatestSimExecStatus } from '@/features/scan-config/components/utils';
import { executionStatusColorMap } from '@/features/task-runner/activity-execution/color-map';
import {
  LEGACY_SIMULATION_STATUS_QUERY_KEY_HEAD,
  TASK_STATUS_POLL_INTERVAL_MS,
  TASK_STATUS_QUERY_KEY_HEAD,
} from '@/features/task-runner/constants';
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
  launchSimBtnLabelPrefix: string;
  onToggleSelectAll: (checked: boolean) => void;
  onActiveSimulationChange: (simulation: ISimulation) => void;
  onSelectedForSimChange: (simulationId: string, selected: boolean) => void;
  onSimulationStatusLoad: (simulationId: string, status: ActivityStatus) => void;
  onRun: (simulationIds: string[]) => void;
  middle: ReactNode;
  right: ReactNode;
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
  launchSimBtnLabelPrefix,
  onToggleSelectAll,
  onActiveSimulationChange,
  onSelectedForSimChange,
  onSimulationStatusLoad,
  onRun,
  middle,
  right,
}: Props) {
  return (
    <ResultsLayout
      campaignId={campaignId}
      left={
        <div className="flex h-full w-full flex-col gap-4 overflow-y-hidden">
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

type SimulationBlockProps = {
  campaignId: string;
  context: WorkspaceContext;
  simulation: ISimulation;
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
      const hasActive = status === ActivityStatus.PENDING || status === ActivityStatus.RUNNING;
      return hasActive && !pauseStatusPolling ? TASK_STATUS_POLL_INTERVAL_MS : false;
    },
  });

  const execStatus =
    remoteStatus && fallbackStatus
      ? getLatestSimExecStatus(remoteStatus, fallbackStatus)
      : (remoteStatus ?? fallbackStatus);
  const statusLoading = isLoading && !execStatus;
  const color = executionStatusColorMap[execStatus ?? ActivityStatus.CREATED];

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
    <button
      className={cn(
        'flex-none cursor-pointer group rounded-2xl border border-gray-200',
        'hover:border-gray-300 hover:border-1.5 transition-all duration-300',
        'shadow-[0_1px_1px_rgba(16,24,40,0.08)] mr-1'
      )}
      type="button"
      title={simulation.name}
      onClick={() => onSelect(simulation.id)}
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
        <div className="mb-2 flex h-18 w-full items-center justify-between">
          <div className="min-w-0 flex-1 overflow-hidden text-left font-bold">
            {!execStatus ||
            ([ActivityStatus.CREATED, ActivityStatus.ERROR].includes(execStatus) &&
              canBeSelectedForSim) ? (
              <div className="flex min-w-0 items-center" style={{ maxWidth: '100%' }}>
                <Checkbox
                  className={cn(
                    'mr-2 transition-colors duration-300 [&_.ant-checkbox+span]:block [&_.ant-checkbox+span]:truncate [&_.ant-checkbox+span]:overflow-hidden [&_.ant-checkbox+span]:text-ellipsis [&_.ant-checkbox+span]:whitespace-nowrap',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6! [&_.ant-checkbox-checked_.ant-checkbox]:border-primary-6!',
                    '[&_.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-6!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-6!',
                    '[&_.ant-checkbox-disabled.ant-checkbox-checked_.ant-checkbox-inner]:after:border-white!'
                  )}
                  disabled={selectionForSimDisabled}
                  onChange={(e) => onSelectedForSimChange(simulation.id, e.target.checked)}
                  checked={selectedForSim}
                  style={{ color, maxWidth: '100%', display: 'flex' }}
                >
                  <span className="text-lg transition-colors duration-300">{simulation.name}</span>
                </Checkbox>
              </div>
            ) : (
              <span
                style={{ color }}
                className="block truncate text-lg transition-colors duration-300"
              >
                {simulation.name}
              </span>
            )}
          </div>
          <div className="ml-4 flex shrink-0">
            {statusLoading ? (
              <StatusBadgeSkeleton />
            ) : (
              <StatusBadge status={execStatus} details={statusDetails} />
            )}
            <RightOutlined className="ml-2 text-sm text-gray-500" />
          </div>
        </div>

        <ScanParams scanParams={simulation.scan_parameters} color={color} />
      </div>
    </button>
  );
}
