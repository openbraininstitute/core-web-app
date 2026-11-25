import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const services = vi.hoisted(() => ({
  listNotebookSessions: vi.fn(),
  startNotebookSession: vi.fn(),
  openNotebookSession: vi.fn(),
  stopNotebookSession: vi.fn(),
  getNotebookProfiles: vi.fn(),
}));
const notification = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('@/services/notebooks', () => services);
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab', projectId: 'proj' }),
}));
vi.mock('@/components/notification', () => ({ useAppNotification: () => notification }));
vi.mock('@/features/low-credits', () => ({
  useLowCredits: () => ({ reportError: () => false, creditsModal: null }),
}));
vi.mock('@/api/virtual-lab-svc/queries/virtual-lab', () => ({ getVirtualLab: vi.fn() }));

import { useJupyterHubSessions } from '@/features/notebooks/hooks/use-run-notebook';

const RUNNING = {
  session_number: 0,
  kind: 'notebook',
  state: 'running',
  profile: 'small',
  started_on: null,
  url: 'u',
};

function setup(sessions: unknown[] = []) {
  services.listNotebookSessions.mockResolvedValue({ sessions, max_sessions: 3 });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useJupyterHubSessions({ cloud: 'cell_a' }), { wrapper });
  return {
    hook,
    expectLoaded: () => waitFor(() => expect(services.listNotebookSessions).toHaveBeenCalled()),
  };
}

describe('useJupyterHubSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
    services.startNotebookSession.mockResolvedValue({
      session_number: 1,
      url: 'new-url',
      message: '',
    });
    services.openNotebookSession.mockResolvedValue({
      session_number: 0,
      url: 'open-url',
      message: '',
    });
    services.stopNotebookSession.mockResolvedValue({ session_number: 0, url: '', message: '' });
  });

  it('lists the running sessions of the project', async () => {
    const { hook } = setup([RUNNING]);
    await waitFor(() => expect(hook.result.current.panel.sessions).toHaveLength(1));
    expect(hook.result.current.panel.maxSessions).toBe(3);
    expect(services.listNotebookSessions).toHaveBeenCalledWith({
      vlabId: 'vlab',
      projectId: 'proj',
      cloud: 'cell_a',
    });
  });

  it('starts a new session in the chosen size even when others are running', async () => {
    const { hook } = setup([RUNNING]);
    await waitFor(() => expect(hook.result.current.panel.sessions).toHaveLength(1));
    await act(() => hook.result.current.openJupyterHub('large'));
    expect(services.startNotebookSession).toHaveBeenCalledWith(
      expect.objectContaining({
        vlabId: 'vlab',
        projectId: 'proj',
        cloud: 'cell_a',
        profile: 'large',
      })
    );
    expect(services.openNotebookSession).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('new-url', '_blank');
  });

  it('attaches to a running session without starting one', async () => {
    const { hook } = setup([RUNNING]);
    await waitFor(() => expect(hook.result.current.panel.sessions).toHaveLength(1));
    await act(async () => hook.result.current.panel.onOpenSession(0));
    expect(services.openNotebookSession).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ vlabId: 'vlab', projectId: 'proj', cloud: 'cell_a' })
    );
    expect(services.startNotebookSession).not.toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('open-url', '_blank');
  });

  it('reuses a running session when the user cannot choose a size', async () => {
    const { hook } = setup([RUNNING]);
    await waitFor(() => expect(hook.result.current.panel.sessions).toHaveLength(1));
    await act(() => hook.result.current.openJupyterHub(undefined, true));
    expect(services.openNotebookSession).toHaveBeenCalledTimes(1);
    expect(services.startNotebookSession).not.toHaveBeenCalled();
  });

  it('starts a session when the user cannot choose a size and none is running', async () => {
    const { hook, expectLoaded } = setup([]);
    await expectLoaded();
    await act(() => hook.result.current.openJupyterHub(undefined, true));
    expect(services.startNotebookSession).toHaveBeenCalledTimes(1);
    expect(services.openNotebookSession).not.toHaveBeenCalled();
  });

  it('stops a session and refreshes the list', async () => {
    const { hook } = setup([RUNNING]);
    await waitFor(() => expect(hook.result.current.panel.sessions).toHaveLength(1));
    const callsBefore = services.listNotebookSessions.mock.calls.length;
    await act(async () => hook.result.current.panel.onStopSession(0));
    expect(services.stopNotebookSession).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ cloud: 'cell_a' })
    );
    expect(notification.success).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(services.listNotebookSessions.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });

  it('shows the hint of the service when starting fails', async () => {
    const { hook, expectLoaded } = setup([]);
    await expectLoaded();
    services.startNotebookSession.mockRejectedValue(
      Error('x', { cause: { hint: 'You reached the maximum number of concurrent sessions' } })
    );
    await act(() => hook.result.current.openJupyterHub('small'));
    expect(notification.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'You reached the maximum number of concurrent sessions' })
    );
    expect(window.open).not.toHaveBeenCalled();
  });
});
