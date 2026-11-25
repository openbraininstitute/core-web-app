import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionSizePanel } from '@/features/notebooks/components/session-size-panel';

import type { SessionPanelProps } from '@/features/notebooks/hooks/use-run-notebook';
import type { NotebookProfile, NotebookSession } from '@/services/notebooks';

const profile = (name: string, display_name: string): NotebookProfile => ({
  name,
  display_name,
  description: '1 CPU, 2 GB RAM',
  requests_cpu: null,
  limits_cpu: null,
  requests_memory: null,
  limits_memory: null,
});

const PROFILES = [profile('small', 'S'), profile('large', 'L')];

const session = (overrides: Partial<NotebookSession>): NotebookSession => ({
  session_number: 0,
  kind: 'notebook',
  state: 'running',
  profile: 'small',
  started_on: new Date(Date.now() - 5 * 60_000).toISOString(),
  url: 'https://hub/user/x/abc',
  ...overrides,
});

function renderPanel(sessionPanel?: Partial<SessionPanelProps>) {
  const props = {
    onSelect: vi.fn(),
    onOpenSession: vi.fn(),
    onStopSession: vi.fn(),
  };
  render(
    <SessionSizePanel
      profiles={PROFILES}
      defaultProfile="small"
      onSelect={props.onSelect}
      sessionPanel={{
        sessions: [],
        maxSessions: 3,
        stoppingSession: null,
        onOpenSession: props.onOpenSession,
        onStopSession: props.onStopSession,
        ...sessionPanel,
      }}
    />
  );
  return props;
}

describe('SessionSizePanel with sessions', () => {
  it('shows only the size picker when nothing is running', () => {
    renderPanel();
    expect(screen.queryByTestId('notebook-running-sessions')).toBeNull();
    expect(screen.getByText('Choose session size')).toBeTruthy();
  });

  it('lists running sessions with their size and lets the user open one', () => {
    const props = renderPanel({
      sessions: [session({ session_number: 0 }), session({ session_number: 1, profile: 'large' })],
    });
    expect(screen.getByText('Attach to a running session')).toBeTruthy();
    expect(screen.getByTestId('notebook-session-open-1').textContent).toBe('Attach');
    expect(screen.getByTestId('notebook-session-open-1').getAttribute('title')).toBe(
      'Attach to this session'
    );
    expect(screen.getByText('Session 1')).toBeTruthy();
    expect(screen.getByText('Session 2')).toBeTruthy();
    expect(screen.getByText('Or start a new session')).toBeTruthy();

    fireEvent.click(screen.getByTestId('notebook-session-open-1'));
    expect(props.onOpenSession).toHaveBeenCalledWith(1);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  it('starts a new session in the chosen size while others are running', () => {
    const props = renderPanel({ sessions: [session({})] });
    fireEvent.click(screen.getByTestId('notebook-profile-large'));
    expect(props.onSelect).toHaveBeenCalledWith('large');
    expect(props.onOpenSession).not.toHaveBeenCalled();
  });

  it('asks for confirmation before stopping a session', () => {
    const props = renderPanel({
      sessions: [session({ session_number: 2, profile: 'large' })],
    });
    fireEvent.click(screen.getByTestId('notebook-session-stop-2'));

    expect(props.onStopSession).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Stop \u201cSession 3\u201d (L)?' });
    expect(dialog.textContent).toContain('Running kernels and unsaved changes will be lost.');
    expect(dialog.textContent).not.toContain('Saved files');
    expect(screen.getByTestId('notebook-stop-dialog-confirm').textContent).toBe('Stop');
    expect(document.activeElement).toBe(screen.getByTestId('notebook-stop-dialog-confirm'));

    fireEvent.click(screen.getByTestId('notebook-stop-dialog-confirm'));
    expect(props.onStopSession).toHaveBeenCalledWith(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    ['the cancel button', () => fireEvent.click(screen.getByTestId('notebook-stop-dialog-cancel'))],
    [
      'a click on the backdrop',
      () => fireEvent.click(screen.getByTestId('notebook-stop-dialog-backdrop')),
    ],
    [
      'Escape',
      () =>
        fireEvent.keyDown(screen.getByTestId('notebook-stop-dialog-confirm'), { key: 'Escape' }),
    ],
  ])('does not stop the session when cancelled with %s', (_label, cancel) => {
    const props = renderPanel({ sessions: [session({ session_number: 0 })] });
    fireEvent.click(screen.getByTestId('notebook-session-stop-0'));
    cancel();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(props.onStopSession).not.toHaveBeenCalled();
  });

  it('shows a session the service reports as stopping as stopping', () => {
    renderPanel({ sessions: [session({ session_number: 0, state: 'stopping' })] });
    expect(screen.getByText('Stopping…')).toBeTruthy();
    expect((screen.getByTestId('notebook-session-open-0') as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByTestId('notebook-session-stop-0') as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('leaves the size out of the title when it is unknown', () => {
    renderPanel({ sessions: [session({ session_number: 0, profile: null })] });
    fireEvent.click(screen.getByTestId('notebook-session-stop-0'));
    expect(screen.getByRole('dialog', { name: 'Stop \u201cSession 1\u201d?' })).toBeTruthy();
  });

  it('keeps the dialog open when clicking inside it', () => {
    renderPanel({ sessions: [session({ session_number: 0 })] });
    fireEvent.click(screen.getByTestId('notebook-session-stop-0'));
    fireEvent.click(screen.getByTestId('notebook-stop-dialog'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows a stopping session as stopping and disables its buttons', () => {
    renderPanel({ sessions: [session({ session_number: 1 })], stoppingSession: 1 });
    expect(screen.getByText('Stopping…')).toBeTruthy();
    expect((screen.getByTestId('notebook-session-stop-1') as HTMLButtonElement).disabled).toBe(
      true
    );
    expect((screen.getByTestId('notebook-session-open-1') as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('does not allow stopping a session that is still starting', () => {
    renderPanel({ sessions: [session({ state: 'starting', started_on: null })] });
    expect(screen.getByText('Starting…')).toBeTruthy();
    expect((screen.getByTestId('notebook-session-stop-0') as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('labels agent sandboxes and gives them no actions', () => {
    renderPanel({
      sessions: [session({ kind: 'sandbox', session_number: null, profile: 'sandbox' })],
    });
    expect(screen.getByText('Agent sandbox')).toBeTruthy();
    expect(screen.queryByText('Attach')).toBeNull();
  });

  it('blocks new sessions once the limit is reached, but still allows opening', () => {
    const props = renderPanel({
      maxSessions: 1,
      sessions: [session({})],
    });
    expect(screen.getByTestId('notebook-session-limit')).toBeTruthy();
    fireEvent.click(screen.getByTestId('notebook-session-open-0'));
    expect(props.onOpenSession).toHaveBeenCalledWith(0);
  });

  it('does not count sandboxes towards the limit', () => {
    renderPanel({
      maxSessions: 1,
      sessions: [session({ kind: 'sandbox', session_number: null })],
    });
    expect(screen.queryByTestId('notebook-session-limit')).toBeNull();
  });
});

describe('SessionSizePanel start time', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps "Started … ago" up to date while the panel stays open', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-23T12:00:00Z'));
    renderPanel({
      sessions: [session({ started_on: new Date('2026-11-23T11:55:00Z').toISOString() })],
    });
    expect(screen.getByText('Started 5 minutes ago')).toBeTruthy();

    act(() => vi.advanceTimersByTime(2 * 60_000));
    expect(screen.getByText('Started 7 minutes ago')).toBeTruthy();
  });
});
