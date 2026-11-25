import authFetch, { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { assertApiResponse } from '@/util/utils';

export type NotebookStartResponse = {
  message: string;
  url: string;
};

/** A single selectable session size, as advertised by GET /profiles. */
export interface NotebookProfile {
  name: string;
  /** Friendly short label for the UI (e.g. "S", "M", "L", "XL"). */
  display_name: string | null;
  /** Human-readable description for the UI (e.g. "M: 2 CPU, 4 GB RAM"). */
  description: string | null;
  requests_cpu: string | null;
  limits_cpu: string | null;
  requests_memory: string | null;
  limits_memory: string | null;
}

/** Response of GET /profiles: the selectable sizes and the default used when none is sent. */
export interface NotebookProfilesResponse {
  default_profile: string | null;
  profiles: NotebookProfile[];
}

export interface NotebookStartInNumberedPodRequest {
  analysis_notebook_template_id: string;
  analysis_notebook_template_filename: string;
  vlabId: string;
  projectId: string;
  session: {
    idToken: string;
    accessToken: string;
    user: {
      email: string;
      id: string;
      name: string;
      username: string;
    };
  };
  podNumber: number;
  cloud: string;
  grading?: NotebookGradingLaunch;
  /** Optional session size profile name (see getNotebookProfiles). Omit for the default size. */
  profile?: string;
}

export interface NotebookGradingLaunch {
  token: string;
  assignment_id: string;
}

export interface EmptyNotebookStartRequest {
  vlabId: string;
  projectId: string;
  session: {
    idToken: string;
    accessToken: string;
    user: {
      email: string;
      id: string;
      name: string;
      username: string;
    };
  };
  cloud: string;
  /** Optional session size profile name (see getNotebookProfiles). Omit for the default size. */
  profile?: string;
}

/**
 * Open a specific analysis notebook template in JupyterHub
 * @param id ID of the analysis notebook template in entity cores
 * @param filename filename of the notebook, for now still needed but will be removed in near future as the notebook service can fetch it from entity core
 * @param vlabId  ID of the virtual lab
 * @param projectId ID of the project
 * @param cloud : notebook service accepts 'cell_a', 'aws', 'cell_b', 'azure'
 * @param podNum : a user can have multiple pods, but normally simply 0
 * @param grading : optional grading-launch context. When set, the notebook service writes the
 *   per-assignment launch file in the spawned pod so the in-pod `obi-notebook` module can
 *   call /params and /grade against grading-service.
 * @param profile : optional session size profile name (see getNotebookProfiles). Omit for the default size.
 */
export async function startNotebook(
  id: string,
  filename: string,
  vlabId: string,
  projectId: string,
  cloud: string,
  podNum?: number,
  grading?: NotebookGradingLaunch,
  profile?: string
): Promise<NotebookStartResponse> {
  const session = await getSession();

  if (!session) {
    throw Error('no session found', {
      cause: {
        error_code: 'SESSION_NOT_FOUND',
        hint: 'You need to be logged in to start a notebook',
      },
    });
  }

  let res: Response;

  const request: NotebookStartInNumberedPodRequest = {
    analysis_notebook_template_id: id,
    analysis_notebook_template_filename: filename,
    vlabId,
    projectId,
    session: {
      idToken: session.idToken,
      accessToken: session.accessToken,
      user: {
        email: session.user.email ?? '',
        id: session.user.id,
        name: session.user.name ?? '',
        username: session.user.username,
      },
    },
    podNumber: podNum === undefined ? 0 : podNum,
    cloud: cloud,
    ...(grading ? { grading } : {}),
    ...(profile ? { profile } : {}),
  };

  res = await authFetch(
    `${config.NOTEBOOK_API_URL}/analysis_notebook_template/start_in_numbered_pod`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );

  if (!res.ok) {
    if (res.status === 460) {
      throw Error('AccountingReservationError', {
        cause: {
          error_code: 'ACCOUNTING_RESERVATION_ERROR',
          hint: 'No reservation could be made in the accounting service',
        },
      });
    }
    if (res.status === 461) {
      throw Error('InsufficientFundsError', {
        cause: {
          error_code: 'INSUFFICIENT_FUNDS_ERROR',
          hint: 'Not enough credits to run the notebook',
        },
      });
    }
    if (res.status === 462) {
      throw Error('JupyterError', {
        cause: {
          error_code: 'JUPYTER_ERROR',
          hint: 'The notebook could not be launched in Jupyter',
        },
      });
    }
  }

  return assertApiResponse(res);
}

/**
 * Fetch the session size profiles the notebook service offers.
 * Use the returned `name` values as the `profile` argument of startNotebook /
 * startEmptyNotebook, and `default_profile` to preselect the default option.
 */
export async function getNotebookProfiles(): Promise<NotebookProfilesResponse> {
  const res = await authFetch(`${config.NOTEBOOK_API_URL}/profiles`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  return assertApiResponse(res);
}

/**
 * Start an empty jupyterhub notebook
 * @param vlabId : ID of the virtual lab
 * @param projectId : ID of the project
 * @param cloud : notebook service accepts 'cell_a', 'aws', 'cell_b', 'azure'
 * @param profile : optional session size profile name (see getNotebookProfiles). Omit for the default size.
 */
export async function startEmptyNotebook(
  virtualLabId: string,
  projectId: string,
  computeCell: string, // accepted: aws, azure, cell_a, cell_b as notebook service does conversion
  profile?: string
): Promise<NotebookStartResponse> {
  const session = await getSession();

  if (!session) {
    throw Error('no session found', {
      cause: {
        error_code: 'SESSION_NOT_FOUND',
        hint: 'You need to be logged in to start a notebook',
      },
    });
  }

  const request: EmptyNotebookStartRequest = {
    vlabId: virtualLabId,
    projectId: projectId,
    session: {
      idToken: session.idToken,
      accessToken: session.accessToken,
      user: {
        email: session.user.email ?? '',
        id: session.user.id,
        name: session.user.name ?? '',
        username: session.user.username,
      },
    },
    cloud: computeCell,
    ...(profile ? { profile } : {}),
  };
  const res = await authFetch(`${config.NOTEBOOK_API_URL}/empty/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    if (res.status === 460) {
      throw Error('AccountingReservationError', {
        cause: {
          error_code: 'ACCOUNTING_RESERVATION_ERROR',
          hint: 'No reservation could be made in the accounting service',
        },
      });
    }
    if (res.status === 461) {
      throw Error('InsufficientFundsError', {
        cause: {
          error_code: 'INSUFFICIENT_FUNDS_ERROR',
          hint: 'Not enough credits to run the notebook',
        },
      });
    }
    if (res.status === 462) {
      throw Error('JupyterError', {
        cause: {
          error_code: 'JUPYTER_ERROR',
          hint: 'The notebook could not be launched in Jupyter',
        },
      });
    }
  }

  return assertApiResponse(res);
}

export interface NotebookSession {
  /** Null for agent sandbox sessions, which cannot be opened or stopped from here. */
  session_number: number | null;
  kind: 'notebook' | 'sandbox';
  state: 'running' | 'starting' | 'stopping';
  /** Profile name, null for pods started before the notebook service labelled them. */
  profile: string | null;
  started_on: string | null;
  url: string;
}

export interface NotebookSessionsResponse {
  sessions: NotebookSession[];
  max_sessions: number;
}

export interface NotebookSessionResponse {
  message: string;
  session_number: number;
  url: string;
}

export interface NotebookTemplateRef {
  id: string;
  filename: string;
}

export type NotebookSessionScope = { vlabId: string; projectId: string; cloud: string };

const SESSION_ERRORS: Record<number, { error_code: string; hint: string }> = {
  460: {
    error_code: 'ACCOUNTING_RESERVATION_ERROR',
    hint: 'No reservation could be made in the accounting service',
  },
  461: {
    error_code: 'INSUFFICIENT_FUNDS_ERROR',
    hint: 'Not enough credits to run the notebook',
  },
  462: { error_code: 'JUPYTER_ERROR', hint: 'The notebook could not be launched in Jupyter' },
  470: {
    error_code: 'SESSION_LIMIT_REACHED',
    hint: 'You reached the maximum number of concurrent sessions in this project. Stop one to start another.',
  },
};

const sessionsUrl = (path = '') => `${config.NOTEBOOK_API_URL}/sessions${path}`;

const scopeQuery = ({ vlabId, projectId, cloud }: NotebookSessionScope) =>
  new URLSearchParams({ vlabId, projectId, cloud }).toString();

async function sessionRequest<T>(url: string, init: RequestInit): Promise<T> {
  const res = await authFetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  const known = SESSION_ERRORS[res.status];
  if (!res.ok && known) throw Error(known.error_code, { cause: known });
  return assertApiResponse(res);
}

/** Running notebook sessions of the current user in a project, plus agent sandboxes. */
export function listNotebookSessions(
  scope: NotebookSessionScope
): Promise<NotebookSessionsResponse> {
  return sessionRequest(`${sessionsUrl()}?${scopeQuery(scope)}`, { method: 'GET' });
}

/** Start a new session; the service picks its number and enforces the concurrent limit. */
export function startNotebookSession(
  scope: NotebookSessionScope & { profile?: string; template?: NotebookTemplateRef }
): Promise<NotebookSessionResponse> {
  const { vlabId, projectId, cloud, profile, template } = scope;
  return sessionRequest(sessionsUrl(), {
    method: 'POST',
    body: JSON.stringify({
      vlabId,
      projectId,
      cloud,
      ...(profile ? { profile } : {}),
      ...(template
        ? {
            analysis_notebook_template_id: template.id,
            analysis_notebook_template_filename: template.filename,
          }
        : {}),
    }),
  });
}

/** Attach to a running session without starting a pod or a new accounting session. */
export function openNotebookSession(
  sessionNumber: number,
  scope: NotebookSessionScope & { template?: NotebookTemplateRef }
): Promise<NotebookSessionResponse> {
  const { vlabId, projectId, cloud, template } = scope;
  return sessionRequest(sessionsUrl(`/${sessionNumber}/open`), {
    method: 'POST',
    body: JSON.stringify({
      vlabId,
      projectId,
      cloud,
      ...(template
        ? {
            analysis_notebook_template_id: template.id,
            analysis_notebook_template_filename: template.filename,
          }
        : {}),
    }),
  });
}

export function stopNotebookSession(
  sessionNumber: number,
  scope: NotebookSessionScope
): Promise<NotebookSessionResponse> {
  return sessionRequest(sessionsUrl(`/${sessionNumber}?${scopeQuery(scope)}`), {
    method: 'DELETE',
  });
}
