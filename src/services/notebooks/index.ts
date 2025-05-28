import { Session } from 'next-auth';
import { notebookSvcBaseUrl } from '@/config';
import { Notebook } from '@/util/virtual-lab/github';
import { assertApiResponse } from '@/util/utils';
import authFetch, { getSession } from '@/authFetch';

enum NotebookImplementationType {
  DUMMY = 'dummy',
  EKS = 'eks',
  OLD_EC2 = 'old-ec2',
  ECS = 'ecs',
}

export type NotebookStartResponse = {
  uniqueId: string;
  message: string;
};

export interface NotebookStartRequest {
  notebook: Notebook;
  vlabId: string;
  projectId: string;
  session: Session;
  implementationType: NotebookImplementationType;
}

export interface NotebookInstance {
  uniqueId: string;
  status: string;
  notebook: Notebook;
  vlabId: string;
  projectId: string;
  startedBy: string;
  lastStartedOn: string; // ISO 8601 timestamp as string
  lastUpdateCheck: string | null; // Nullable ISO 8601 string
  implementationType: NotebookImplementationType;
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
        hint: 'Make sure the user is authenticated before calling this function.',
      },
    });
  }
  const request: NotebookStartRequest = {
    notebook,
    vlabId,
    projectId,
    session,
    implementationType: NotebookImplementationType.DUMMY,
  };

  const res = await authFetch(`${notebookSvcBaseUrl}/notebook/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  return assertApiResponse(res);
}
