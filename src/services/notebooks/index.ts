import { Session } from 'next-auth';
import { notebookSvcBaseUrl } from '@/config';
import { Notebook } from '@/util/virtual-lab/types';
import { assertApiResponse } from '@/util/utils';
import authFetch, { getSession } from '@/authFetch';

export type NotebookStartResponse = {
  message: string;
  url: string;
};

export interface NotebookStartRequest {
  notebook: Notebook;
  vlabId: string;
  projectId: string;
  session: Session;
}

export async function startNotebook(
  notebook: Notebook,
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
    notebook,
    vlabId,
    projectId,
    session,
  };
  const res = await authFetch(`${notebookSvcBaseUrl}/notebook/start`, {
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
  }

  return assertApiResponse(res);
}
