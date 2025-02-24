import { NotebooksArraySchema } from '../schemas';
import UserNotebookPage from './UserNotebookPage';
import { ServerSideComponentProp } from '@/types/common';
import { fetchNotebook, Notebook } from '@/util/virtual-lab/github';
import { virtualLabApi } from '@/config';
import { assertErrorMessage, assertVLApiResponse } from '@/util/utils';
import authFetch from '@/authFetch';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }>) {
  const { projectId, virtualLabId } = params;
  let error = '';
  let initialNotebooks: Notebook[] = [];

  try {
    const userNotebooksRes = await authFetch(
      `${virtualLabApi.url}/projects/${projectId}/notebooks/?page_size=100`
    );

    const userNotebookData = await assertVLApiResponse(userNotebooksRes);

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
