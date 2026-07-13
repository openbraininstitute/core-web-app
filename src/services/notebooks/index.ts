import { createAnalysisNotebookTemplate } from '@/api/entitycore/queries/analysis-notebook-template';
import { createAsset, downloadAsset } from '@/api/entitycore/queries/assets';
import {
  createContribution,
  getContributions,
} from '@/api/entitycore/queries/general/contribution';
import { EntityTypeDict } from '@/api/entitycore/types';
import authFetch, { getSession } from '@/auth-fetch';
import { config } from '@/config';
import { assertApiResponse } from '@/util/utils';

import type { IAnalysisNotebookTemplate } from '@/api/entitycore/types/entities/analysis-notebook-template';

export type NotebookStartResponse = {
  message: string;
  url: string;
};

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
 */
export async function startNotebook(
  id: string,
  filename: string,
  vlabId: string,
  projectId: string,
  cloud: string,
  podNum?: number,
  grading?: NotebookGradingLaunch
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
 * Start an empty jupyterhub notebook
 * @param vlabId : ID of the virtual lab
 * @param projectId : ID of the project
 * @param cloud : notebook service accepts 'cell_a', 'aws', 'cell_b', 'azure'
 */
export async function startEmptyNotebook(
  virtualLabId: string,
  projectId: string,
  computeCell: string // accepted: aws, azure, cell_a, cell_b as notebook service does conversion
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

  const request = {
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

async function _syncNotebook({
  notebook,
  virtualLabId,
  projectId,
  targetProjectId,
}: {
  notebook: IAnalysisNotebookTemplate;
  virtualLabId: string;
  projectId: string;
  targetProjectId: string;
}) {
  const createdNotebook = await createAnalysisNotebookTemplate({
    payload: notebook,
    context: { virtualLabId, projectId: targetProjectId },
  });

  const contributions = await getContributions({
    context: { virtualLabId, projectId },
    filters: { entity__id: notebook.id },
  });

  const sourceAssets = await Promise.all(
    notebook.assets.map(async (asset) => {
      const arrayBuffer = (await downloadAsset({
        ctx: {
          virtualLabId,
          projectId,
        },
        entityType: EntityTypeDict.AnalysisNotebookTemplate,
        entityId: notebook.id,
        id: asset.id,
        asRawResponse: false,
      })) as ArrayBuffer;

      return {
        ctx: { virtualLabId, projectId: targetProjectId },
        entityType: EntityTypeDict.AnalysisNotebookTemplate,
        entityId: createdNotebook.id,
        fileName: asset.path.split('/').pop() ?? asset.id,
        payload: arrayBuffer,
        mimeType: asset.content_type,
        label: asset.label,
      };
    })
  );

  // Upload assets to new notebook

  await Promise.all(
    sourceAssets.map((asset) => {
      return createAsset(asset);
    })
  );

  // Upload contributions to new notebook

  await Promise.all(
    contributions.data.map((contributor) =>
      createContribution({
        context: { virtualLabId, projectId: targetProjectId },
        contributor: {
          agent_id: contributor.agent.id,
          entity_id: createdNotebook.id,
          role_id: contributor.role.id,
        },
      })
    )
  );
}

export async function syncNotebook({
  notebook,
  virtualLabId,
  projectId,
  targetProjectIds,
}: {
  notebook: IAnalysisNotebookTemplate;
  virtualLabId: string;
  projectId: string;
  targetProjectIds: string[];
}) {
  const promises = targetProjectIds.map((id) => {
    return _syncNotebook({ notebook, virtualLabId, projectId, targetProjectId: id });
  });

  return await Promise.all(promises);
}
