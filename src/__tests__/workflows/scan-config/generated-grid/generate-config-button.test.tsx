import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import GenerateConfigButton from '@/features/scan-config/components/generate-config-button';
import {
  ScanConfigActivity,
  SimulateScanConfigTabs,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

const mocks = vi.hoisted(() => ({
  authFetch: vi.fn(),
  notificationError: vi.fn(),
  notifyCredits: vi.fn(),
  isVirtualLabAdmin: false,
  shouldShowError: false,
}));

vi.mock('@/auth-fetch', () => ({
  authFetch: mocks.authFetch,
}));

vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ error: mocks.notificationError }),
}));

vi.mock('@/hooks/use-credits-access-guard', () => ({
  useCreditsAccessGuard: () => ({
    notifyCredits: mocks.notifyCredits,
    shouldShowError: mocks.shouldShowError,
  }),
}));

vi.mock('@/hooks/use-user-membership', () => ({
  useWorkspaceMembership: () => ({ isVirtualLabAdmin: mocks.isVirtualLabAdmin }),
}));

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'virtual-lab-id', projectId: 'project-id' }),
}));

function renderGenerateButton(
  props: Partial<React.ComponentProps<typeof GenerateConfigButton>> = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const setTab = vi.fn();
  const setCampaignId = vi.fn();
  const setLoading = vi.fn();

  render(
    <QueryClientProvider client={queryClient}>
      <GenerateConfigButton
        loading={false}
        errors={null}
        campaignId=""
        setCampaignId={setCampaignId}
        setLoading={setLoading}
        config={{ initialize: { seed: 1 } }}
        setTab={setTab as React.Dispatch<React.SetStateAction<TScanConfigTabs>>}
        activity={ScanConfigActivity.Simulate}
        generatedApiUrl="https://obi-one.test/generated/circuit-simulation-scan-config-generate-grid"
        entityType={ExtendedEntitiesTypeDict.Circuit}
        {...props}
      />
    </QueryClientProvider>
  );

  return { queryClient, setTab, setCampaignId, setLoading };
}

describe('scan-config generated-grid behavior', () => {
  beforeEach(() => {
    mocks.authFetch.mockReset();
    mocks.notificationError.mockReset();
    mocks.notifyCredits.mockReset();
    mocks.isVirtualLabAdmin = false;
    mocks.shouldShowError = false;
  });

  it('checks coordinate count before generating a campaign and switches to results', async () => {
    mocks.authFetch
      .mockResolvedValueOnce(Response.json({ count: 3 }))
      .mockResolvedValueOnce(Response.json('campaign-id'));

    const { queryClient, setTab, setCampaignId, setLoading } = renderGenerateButton();
    queryClient.setQueryData(
      [
        'workspace/activities/test',
        {
          virtualLabId: 'virtual-lab-id',
          projectId: 'project-id',
          activity: ScanConfigActivity.Simulate,
          entityType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
        },
      ],
      'matching'
    );
    queryClient.setQueryData(['other-query'], 'not-matching');

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() => expect(setCampaignId).toHaveBeenCalledWith('campaign-id'));

    expect(mocks.authFetch).toHaveBeenNthCalledWith(
      1,
      'https://obi-one.test/declared/scan_config/grid-scan-coordinate-count',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ initialize: { seed: 1 } }),
        headers: expect.objectContaining({
          'virtual-lab-id': 'virtual-lab-id',
          'project-id': 'project-id',
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(mocks.authFetch).toHaveBeenNthCalledWith(
      2,
      'https://obi-one.test/generated/circuit-simulation-scan-config-generate-grid',
      expect.objectContaining({ method: 'POST' })
    );
    expect(setTab).toHaveBeenCalledWith({
      id: SimulateScanConfigTabs.simulations,
      __activity: ScanConfigActivity.Simulate,
    });
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('does not call generated-grid when coordinate count fails for a non-credit error', async () => {
    mocks.authFetch.mockResolvedValueOnce(
      Response.json({ detail: 'invalid coordinate count' }, { status: 400 })
    );

    const { setCampaignId } = renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() =>
      expect(mocks.notificationError).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'invalid coordinate count' })
      )
    );

    expect(mocks.authFetch).toHaveBeenCalledTimes(1);
    expect(setCampaignId).not.toHaveBeenCalled();
  });

  it('shows credits notification for low-funds coordinate count failures', async () => {
    mocks.authFetch.mockResolvedValueOnce(
      Response.json(
        { error_code: 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR', detail: 'insufficient credits' },
        { status: 402 }
      )
    );

    renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() => expect(mocks.notifyCredits).toHaveBeenCalledTimes(1));
    expect(mocks.notificationError).not.toHaveBeenCalled();
    expect(mocks.authFetch).toHaveBeenCalledTimes(1);
  });

  it('shows generated-grid credits errors for non-admin users', async () => {
    mocks.authFetch
      .mockResolvedValueOnce(Response.json({ count: 3 }))
      .mockResolvedValueOnce(
        Response.json({ detail: 'insufficient credits available' }, { status: 402 })
      );

    renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() => expect(mocks.notifyCredits).toHaveBeenCalledTimes(1));
    expect(mocks.notificationError).not.toHaveBeenCalled();
  });

  it('shows generated-grid validation errors for non-credit API failures', async () => {
    mocks.authFetch
      .mockResolvedValueOnce(Response.json({ count: 3 }))
      .mockResolvedValueOnce(
        Response.json({ details: [{ msg: 'invalid scan config' }] }, { status: 400 })
      );

    renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() =>
      expect(mocks.notificationError).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'invalid scan config' })
      )
    );
  });

  it('shows generated-grid server error details', async () => {
    mocks.authFetch
      .mockResolvedValueOnce(Response.json({ count: 3 }))
      .mockResolvedValueOnce(Response.json({ detail: 'server exploded' }, { status: 500 }));

    renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() =>
      expect(mocks.notificationError).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'server exploded' })
      )
    );
  });

  it('reports an empty returned campaign id as a generation failure', async () => {
    mocks.authFetch
      .mockResolvedValueOnce(Response.json({ count: 3 }))
      .mockResolvedValueOnce(Response.json(''));

    const { setCampaignId } = renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() => expect(mocks.notificationError).toHaveBeenCalledTimes(1));
    expect(setCampaignId).not.toHaveBeenCalled();
  });

  it('reports thrown request errors and clears loading', async () => {
    mocks.authFetch.mockRejectedValueOnce(new Error('network failed'));

    const { setLoading } = renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    await waitFor(() =>
      expect(mocks.notificationError).toHaveBeenCalledWith({ message: 'network failed' })
    );
    expect(setLoading).toHaveBeenLastCalledWith(false);
  });

  it('shows the credits guard and skips network calls when credits are blocked client-side', async () => {
    mocks.shouldShowError = true;

    renderGenerateButton();

    fireEvent.click(screen.getByRole('button', { name: /generate simulation/i }));

    expect(mocks.notifyCredits).toHaveBeenCalledTimes(1);
    expect(mocks.authFetch).not.toHaveBeenCalled();
  });

  it('resets an existing campaign instead of generating a new one', () => {
    const { setCampaignId } = renderGenerateButton({ campaignId: 'campaign-id' });

    fireEvent.click(screen.getByRole('button', { name: /new simulation campaign/i }));

    expect(setCampaignId).toHaveBeenCalledWith('');
    expect(mocks.authFetch).not.toHaveBeenCalled();
  });

  it.each([
    [
      ScanConfigActivity.Extract,
      /generate extraction/i,
      {
        id: 'extractions',
        __activity: ScanConfigActivity.Extract,
      },
    ],
    [
      ScanConfigActivity.Process,
      /generate skeletonization/i,
      {
        id: 'skeletonizations',
        __activity: ScanConfigActivity.Process,
      },
    ],
    [
      ScanConfigActivity.Build,
      /generate/i,
      {
        id: 'results',
        __activity: ScanConfigActivity.Build,
      },
    ],
  ] as const)('switches %s campaigns to the activity results tab', async (activity, name, tab) => {
    mocks.authFetch
      .mockResolvedValueOnce(Response.json({ count: 3 }))
      .mockResolvedValueOnce(Response.json('campaign-id'));

    const { setTab } = renderGenerateButton({ activity });

    fireEvent.click(screen.getByRole('button', { name }));

    await waitFor(() => expect(setTab).toHaveBeenCalledWith(tab));
  });

  it('does not submit when disabled by validation errors or loading state', () => {
    const { setLoading } = renderGenerateButton({
      errors: [{ message: 'invalid' } as never],
    });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(setLoading).not.toHaveBeenCalled();

    renderGenerateButton({ loading: true });
    expect(screen.getAllByRole('button').at(-1)).toBeDisabled();
    expect(mocks.authFetch).not.toHaveBeenCalled();
  });
});
