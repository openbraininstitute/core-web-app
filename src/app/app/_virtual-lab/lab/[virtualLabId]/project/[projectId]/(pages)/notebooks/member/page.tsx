import { NotebooksArraySchema } from '../schemas';
import UserNotebookPage from './UserNotebookPage';
import { fetchNotebook } from '@/util/virtual-lab/github';
import { virtualLabApi } from '@/config';
import { assertErrorMessage, assertApiResponse } from '@/util/utils';
import authFetch from '@/authFetch';

import type { ServerSideComponentProp } from '@/types/common';
import type { Notebook } from '@/util/virtual-lab/types';

export default async function Notebooks({
  params: promisedParams,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }, any>) {
  const params = await promisedParams;
  const { projectId, virtualLabId } = params;
  let error = '';
  let initialNotebooks: Notebook[] = [];

  try {
    const userNotebooksRes = await authFetch(
      `${virtualLabApi.url}/projects/${projectId}/notebooks/?page_size=100`
    );

    const userNotebookData = await assertApiResponse(userNotebooksRes);

    const notebooks = NotebooksArraySchema.parse(userNotebookData.data.results);

    const notebooksPromises = notebooks.map((n) => fetchNotebook(n.github_file_url));

    const validatedNotebooks = await Promise.all(notebooksPromises);
    initialNotebooks = validatedNotebooks.map((n, i) => {
      return { ...n, id: notebooks[i].id, creationDate: notebooks[i].created_at };
    });
  } catch (e) {
    error = assertErrorMessage(e);
  }

  return (
    <UserNotebookPage
      initialNotebooks={initialNotebooks}
      projectId={projectId}
      vlabId={virtualLabId}
      serverError={error}
    />
  );
}
