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
  default_profile: string;
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
