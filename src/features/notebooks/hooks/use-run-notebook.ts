'use client';

import { type RemixiconComponentType, RiPlayFill } from '@remixicon/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { getAsset } from '@/api/entitycore/selectors/assets';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { useAppNotification } from '@/components/notification';
import { config } from '@/config';
import { useLowCredits } from '@/features/low-credits';
import {
  getNotebookProfiles,
  listNotebookSessions,
  type NotebookSession,
  type NotebookSessionScope,
  type NotebookTemplateRef,
  openNotebookSession,
  startNotebookSession,
  stopNotebookSession,
} from '@/services/notebooks';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { IAsset } from '@/api/entitycore/types/shared/global';

export type NotebookRunTarget = {
  key: string;
  label: string;
  /** overrides the virtual lab's compute cell (dev-only cloud targets) */
  cloud?: string;
  /** brand/run icon */
  Icon: RemixiconComponentType;
  hideInProduction?: boolean;
};

const DEV_DEPLOYMENTS = ['local', 'preview', 'development'];

const DEFAULT_RUN_TARGET: NotebookRunTarget = {
  key: 'default',
  label: 'Run notebook',
  Icon: RiPlayFill,
  hideInProduction: false,
};
const DEV_RUN_TARGETS: NotebookRunTarget[] = [];

/**
 * Run targets visible for the given deployment: always the default, plus any dev-only
 * targets in dev/preview/local deployments.
 */
export function buildRunTargets(deploymentEnv: string): NotebookRunTarget[] {
  return [DEFAULT_RUN_TARGET, ...(DEV_DEPLOYMENTS.includes(deploymentEnv) ? DEV_RUN_TARGETS : [])];
}

/**
 * Shared "Run notebook" behaviour for the table-less notebook surfaces (mini-detail drawer and
 * detail action rail): launches the `jupyter_notebook` asset on JupyterHub. `openJupyterHub` opens a bare
 * JupyterHub session (used by the Results "Open notebook" action).
 */
export function useNotebookProfiles(enabled = true) {
  const { data } = useQuery({
    queryKey: ['notebook-profiles'],
    queryFn: () => getNotebookProfiles(),
    enabled,
    staleTime: 5 * 60 * 1000,
    select: (response) => ({
      profiles: response.profiles ?? [],
      defaultProfile: response.default_profile ?? null,
    }),
  });
  return data ?? { profiles: [], defaultProfile: null };
}

const SESSIONS_REFRESH_MS = 15_000;
/** Faster refresh while a session is starting or stopping, so the list settles quickly. */
const SESSIONS_TRANSITION_REFRESH_MS = 3_000;

export function sessionsRefreshInterval(sessions: NotebookSession[] | undefined): number {
  return sessions?.some((session) => session.state !== 'running')
    ? SESSIONS_TRANSITION_REFRESH_MS
    : SESSIONS_REFRESH_MS;
}

export type SessionPanelProps = {
  sessions: NotebookSession[];
  maxSessions: number | null;
  stoppingSession: number | null;
  onOpenSession: (sessionNumber: number) => void;
  onStopSession: (sessionNumber: number) => void;
};

/** Number of the first notebook session that can be attached to, if any. */
const firstOpenableSessionNumber = (sessions: NotebookSession[]): number | null =>
  sessions.find((session) => session.kind === 'notebook')?.session_number ?? null;

/** The user's running sessions in this project, refreshed while the page is open. */
export function useNotebookSessions(cloud: string | undefined, enabled = true) {
  const { virtualLabId, projectId } = useWorkspace();
  const { data } = useQuery({
    queryKey: ['notebook-sessions', virtualLabId, projectId, cloud],
    queryFn: () => listNotebookSessions({ vlabId: virtualLabId, projectId, cloud: cloud ?? '' }),
    enabled: enabled && Boolean(virtualLabId) && Boolean(projectId) && Boolean(cloud),
    refetchInterval: (query) => sessionsRefreshInterval(query.state.data?.sessions),
    staleTime: 0,
  });
  return { sessions: data?.sessions ?? [], maxSessions: data?.max_sessions ?? null };
}

/** Start, attach to and stop sessions, with the notifications shared by every entry point. */
function useSessionActions(cloud: string | undefined) {
  const { virtualLabId, projectId } = useWorkspace();
  const notification = useAppNotification();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [stoppingSession, setStoppingSession] = useState<number | null>(null);
  const { reportError: reportLowCredits, creditsModal } = useLowCredits({
    subject: 'run the notebook',
  });

  const refreshSessions = () =>
    queryClient.invalidateQueries({ queryKey: ['notebook-sessions', virtualLabId, projectId] });

  const reportError = (error: unknown, fallback: string) => {
    if (reportLowCredits(error)) return;
    const cause =
      error instanceof Error ? (error.cause as Record<string, string> | undefined) : null;
    notification.error({
      message: cause?.hint ?? cause?.detail ?? fallback,
      key: 'notebook-error',
      placement: 'topRight',
    });
  };

  async function guarded(
    fallback: string,
    action: (scope: NotebookSessionScope) => Promise<{ url: string }>
  ) {
    if (busy || !cloud) return;
    setBusy(true);
    try {
      const { url } = await action({ vlabId: virtualLabId, projectId, cloud });
      window.open(url, '_blank');
    } catch (error) {
      reportError(error, fallback);
    } finally {
      setBusy(false);
      refreshSessions();
    }
  }

  return {
    busy,
    stoppingSession,
    creditsModal,
    start: (profile?: string, template?: NotebookTemplateRef) =>
      guarded('Failed to start notebook', async (scope) => {
        const response = await startNotebookSession({ ...scope, profile, template });
        notification.success({
          message: 'Notebook starting',
          key: 'notebook-started-successfully',
          placement: 'topRight',
        });
        return response;
      }),
    open: (sessionNumber: number, template?: NotebookTemplateRef) =>
      guarded('Failed to attach to the session', (scope) =>
        openNotebookSession(sessionNumber, { ...scope, template })
      ),
    async stop(sessionNumber: number) {
      if (!cloud || stoppingSession !== null) return;
      setStoppingSession(sessionNumber);
      try {
        await stopNotebookSession(sessionNumber, { vlabId: virtualLabId, projectId, cloud });
      } catch (error) {
        reportError(error, 'Failed to stop the session');
      } finally {
        setStoppingSession(null);
        refreshSessions();
      }
    },
  };
}

/**
 * Sessions + actions for surfaces that only open a bare JupyterHub (no notebook template).
 * `reuseExisting` attaches to a running session instead of starting a new one, for users
 * who do not get to choose (course students).
 */
export function useJupyterHubSessions({
  cloud,
  enabled = true,
}: {
  cloud: string | undefined;
  enabled?: boolean;
}) {
  const { sessions, maxSessions } = useNotebookSessions(cloud, enabled);
  const actions = useSessionActions(cloud);

  const panel: SessionPanelProps = {
    sessions,
    maxSessions,
    stoppingSession: actions.stoppingSession,
    onOpenSession: (sessionNumber) => actions.open(sessionNumber),
    onStopSession: actions.stop,
  };

  function openJupyterHub(profile?: string, reuseExisting = false) {
    const existing = reuseExisting ? firstOpenableSessionNumber(sessions) : null;
    if (existing !== null) return actions.open(existing);
    return actions.start(profile);
  }

  return { panel, openJupyterHub, opening: actions.busy, creditsModal: actions.creditsModal };
}

export function useRunNotebook({
  id,
  assets,
  enabled = true,
}: {
  id: string;
  assets: IAsset[];
  enabled?: boolean;
}) {
  const { virtualLabId } = useWorkspace();
  const [runningTarget, setRunningTarget] = useState<string | null>(null);

  const { data: virtualLabData } = useQuery({
    queryKey: keyBuilder.getOneLab({ virtualLabId }),
    queryFn: () => getVirtualLab({ id: virtualLabId }),
    enabled: Boolean(virtualLabId) && enabled,
  });

  const { profiles, defaultProfile } = useNotebookProfiles(enabled);
  const cloud = virtualLabData?.compute_cell;
  const { sessions, maxSessions } = useNotebookSessions(cloud, enabled);
  const actions = useSessionActions(cloud);

  const runTargets = buildRunTargets(config.DEPLOYMENT_ENV);

  const templateRef = (): NotebookTemplateRef | null => {
    const asset = getAsset({ assets, label: AssetLabel.jupyter_notebook }).getOneOrNull();
    return asset ? { id, filename: asset.path } : null;
  };

  const sessionPanel = (withTemplate: boolean): SessionPanelProps => ({
    sessions,
    maxSessions,
    stoppingSession: actions.stoppingSession,
    onOpenSession: (sessionNumber) =>
      actions.open(sessionNumber, withTemplate ? (templateRef() ?? undefined) : undefined),
    onStopSession: actions.stop,
  });

  async function run(
    target: NotebookRunTarget = DEFAULT_RUN_TARGET,
    profile?: string,
    reuseExisting = false
  ) {
    if (runningTarget || actions.busy) return;
    const template = templateRef();
    if (!template || !virtualLabData) return;

    setRunningTarget(target.key);
    try {
      const existing = reuseExisting ? firstOpenableSessionNumber(sessions) : null;
      if (existing !== null) await actions.open(existing, template);
      else await actions.start(profile, template);
    } finally {
      setRunningTarget(null);
    }
  }

  function openJupyterHub(profile?: string, reuseExisting = false) {
    const existing = reuseExisting ? firstOpenableSessionNumber(sessions) : null;
    if (existing !== null) return actions.open(existing);
    return actions.start(profile);
  }

  return {
    run,
    runTargets,
    runningTarget,
    running: runningTarget !== null,
    openJupyterHub,
    opening: actions.busy && runningTarget === null,
    creditsModal: actions.creditsModal,
    profiles,
    defaultProfile,
    virtualLabData,
    /** attach to a session with the notebook template loaded into it */
    runSessionPanel: sessionPanel(true),
    /** attach to a session without loading a template */
    hubSessionPanel: sessionPanel(false),
  };
}
