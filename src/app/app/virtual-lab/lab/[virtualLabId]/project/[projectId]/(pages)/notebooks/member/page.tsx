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
  let warning = '';
  let initialNotebooks: Notebook[] = [];

  try {
    const userNotebooksRes = await authFetch(
      `${virtualLabApi.url}/projects/${projectId}/notebooks/?page_size=100`
    );

    const userNotebookData = await assertApiResponse(userNotebooksRes);

    const notebooks = NotebooksArraySchema.parse(userNotebookData.data.results);

    const notebooksPromises = notebooks.map(async (n) => {
      try {
        const notebookData = await fetchNotebook(n.github_file_url);
        return { ...notebookData, id: n.id, creationDate: n.created_at };
      } catch (e) {
        // Collect warning but continue
        warning = `The notebook ${n.github_file_url} failed to load, please ensure the notebook folder exists and the repository is public`;
        return null; // skip this notebook
      }
    });

    const validatedNotebooks = await Promise.all(notebooksPromises);
    initialNotebooks = validatedNotebooks.filter(Boolean) as Notebook[];
  } catch (e) {
    warning = assertErrorMessage(e); // fail only if the main list fetch fails
  }

  return (
    <UserNotebookPage
      initialNotebooks={initialNotebooks}
      projectId={projectId}
      vlabId={virtualLabId}
      serverError={warning}
    />
  );
}
