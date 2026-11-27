import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ApiError } from '@/api/error';
import { ObiOneTaskTypeDict } from '@/api/one/types/task';
import { SimulationsTab } from '@/features/scan-config/use-cases/simulations/results';
import { messages } from '@/i18n/en/simulation';

import type { ReactNode } from 'react';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';

const mocks = vi.hoisted(() => ({
  model: {} as { entity?: unknown; entityType?: string },
  notificationError: vi.fn(),
  openModal: vi.fn(),
  costConfirmation: {} as { taskType?: string; onConfirm?: (ids: string[]) => unknown },
  runTask: vi.fn(),
}));

const Passthrough = vi.hoisted(
  () =>
    ({ children }: { children: ReactNode }) =>
      children
);

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/features/scan-config/components/atoms', () => ({
  useModelQuery: () => mocks.model,
}));
vi.mock('@/features/scan-config/components/cost-confirmation-modal', () => ({
  useCostConfirmation: (params: typeof mocks.costConfirmation) => {
    Object.assign(mocks.costConfirmation, params);
    return { openModal: mocks.openModal, modal: null };
  },
}));
vi.mock('@/features/scan-config/use-cases/simulations/ui-adapter', () => ({
  SimulationsResultsUiAdapter: ({ onRun, loading }: { onRun: () => void; loading: boolean }) => (
    <button type="button" disabled={loading} onClick={onRun}>
      Launch
    </button>
  ),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ error: mocks.notificationError, success: vi.fn() }),
}));
vi.mock('@/api/one/runner', () => ({ runTask: mocks.runTask }));
vi.mock('@/entity-configuration/domain/simulation/simulation-campaign', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  listAllChildren: async () => [{ id: 's1', name: 's1', entity_id: 'model', assets: [] }],
  listExecutionsBySimulationId: async () => [],
}));
vi.mock('@/ui/hooks/use-workspace', () => ({ useWorkspace: () => ({}) }));
vi.mock('@/features/low-credits', () => ({
  isLowCreditsError: () => false,
  useLowCredits: () => ({ notifyLowCredits: vi.fn(), reportError: vi.fn(), creditsModal: null }),
}));
vi.mock('@/features/offline-auth-management', () => ({
  OfflineTokenConsentModal: () => null,
  useEnsureOfflineTokenConsent: () => ({ modal: {}, ensure: vi.fn(), cancel: vi.fn() }),
}));
vi.mock('@/features/circuit-nodes/components/kept-nodes-grid', () => ({
  NodesTableKeeper: Passthrough,
}));
vi.mock('@/features/circuit-nodes/hooks/nodes-session-keeper', () => ({
  NodesSessionKeeper: Passthrough,
}));
vi.mock('@/features/scan-config/components/file-viewer', () => ({
  FileViewer: () => null,
  hasStatistics: () => false,
}));
vi.mock('@/features/scan-config/components/simulation-files', () => ({
  SimulationFiles: () => null,
  useSimulationResultFiles: () => [false, []],
}));
vi.mock('@/features/scan-config/use-cases/simulations/report-picker', () => ({
  byReportKind: () => 0,
  ReportPicker: () => null,
}));
vi.mock('@/features/scan-config/use-cases/simulations/scan-parameter-picker', () => ({
  ScanParameterPicker: () => null,
}));
vi.mock('@/features/sonata-viewer/simulation-reports-context', () => ({
  SimulationReportsProvider: Passthrough,
}));
vi.mock('@/features/spike-viewer/config-timeline', () => ({ configTimeline: () => null }));
vi.mock('@/features/spike-viewer/simulation-context', () => ({ SimulationProvider: Passthrough }));
vi.mock('@/features/task-logs-stream', () => ({
  TaskConfigurationViewer: () => null,
  TaskLogsViewer: () => null,
}));
vi.mock('@/features/task-runner', () => ({ isTerminalActivityStatus: () => false }));
vi.mock('@/features/task-runner/hooks/use-balance-refresh', () => ({
  invalidateProjectBalance: vi.fn(),
}));

async function clickLaunch() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SimulationsTab
        campaignId="campaign"
        campaignOriginAction={'' as TScanConfigCampaignOriginActionDict}
        isCampaignIdChanged={false}
      />
    </QueryClientProvider>
  );
  const launch = screen.getByRole<HTMLButtonElement>('button', { name: 'Launch' });
  await waitFor(() => expect(launch.disabled).toBe(false));
  launch.click();
}

describe('SimulationsTab launch routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [EntityTypeDict.Memodel, ObiOneTaskTypeDict.SingleNeuronSimulationExecution],
    [EntityTypeDict.IonChannelModel, ObiOneTaskTypeDict.IonChannelModelSimulationExecution],
  ])('launches a %s through obi-one as %s', async (entityType, taskType) => {
    mocks.model = { entityType };
    mocks.runTask.mockResolvedValue({ job_id: 'job' });

    await clickLaunch();

    expect(mocks.openModal).toHaveBeenCalled();
    expect(mocks.costConfirmation.taskType).toBe(taskType);
    await mocks.costConfirmation.onConfirm?.(['s1']);
    expect(mocks.runTask).toHaveBeenCalledWith(
      expect.objectContaining({ task_type: taskType, config_id: 's1' })
    );
  });

  it.each([
    [
      "the API's message for an API error",
      new ApiError('Bad request', { message: 'No seats' }),
      'No seats',
    ],
    ['the generic message for any other error', new Error('boom'), messages.SimulationLaunchError],
  ])('shows %s when a launch fails', async (_, error, message) => {
    mocks.model = { entityType: EntityTypeDict.IonChannelModel };
    mocks.runTask.mockRejectedValue(error);

    await clickLaunch();
    await mocks.costConfirmation.onConfirm?.(['s1']);

    expect(mocks.notificationError).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });

  it.each([
    ['a model that failed to load', {}],
    ['a circuit that failed to load', { entityType: EntityTypeDict.Circuit }],
    [
      'a circuit with an unknown scale',
      { entity: { scale: 'unknown' }, entityType: EntityTypeDict.Circuit },
    ],
  ])('launches nothing for %s', async (_, model) => {
    mocks.model = model;

    await clickLaunch();

    expect(mocks.notificationError).toHaveBeenCalledWith(
      expect.objectContaining({ message: messages.SimulationLaunchTargetError })
    );
    expect(mocks.openModal).not.toHaveBeenCalled();
    expect(mocks.runTask).not.toHaveBeenCalled();
  });
});
