import { assertApiResponse } from '@/util/utils';
import authFetch, { getSession } from '@/authFetch';

export type NotebookStartResponse = {
  message: string;
  url: string;
};

export interface NotebookStartRequest {
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
}

export async function startNotebook(
  id: string,
  filename: string,
  vlabId: string,
  projectId: string
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

  const request: NotebookStartRequest = {
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
  };
  const res = await authFetch(
    `https://staging.openbraininstitute.org/api/notebook_service/analysis_notebook_template/start`,
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
