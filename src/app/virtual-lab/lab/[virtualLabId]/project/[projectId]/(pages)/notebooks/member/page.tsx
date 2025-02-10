import { z } from 'zod';
import UserNotebookPage from './UserNotebookPage';
import { ServerSideComponentProp } from '@/types/common';
import { fetchNotebook } from '@/util/virtual-lab/github';
import { virtualLabApi } from '@/config';
import { assertVLApiResponse } from '@/util/utils';
import authFetch from '@/authFetch';

const NotebookSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  github_file_url: z.string().url(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

const NotebooksArraySchema = z.array(NotebookSchema);

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string; virtualLabId: string }>) {
  const { projectId, virtualLabId } = params;

  let userNotebookData: any;

  try {
    const userNotebooksRes = await authFetch(
      `${virtualLabApi.url}/projects/${projectId}/notebooks/?page_size=100`
    );

    userNotebookData = await assertVLApiResponse(userNotebooksRes);
  } catch {
    throw new Error(`Failed to fetch notebooks for project ${projectId}`);
  }

  let notebooks: ReturnType<typeof NotebooksArraySchema.parse>;

  try {
    notebooks = NotebooksArraySchema.parse(userNotebookData.data.results);
  } catch {
    throw new Error(`Failed to validate data for notebooks`);
  }

  const notebooksPromises = notebooks.map((n) => fetchNotebook(n.github_file_url));
  const validatedNotebooks = await Promise.all(notebooksPromises);
  const initialNotebooks = validatedNotebooks.map((n, i) => {
    return { ...n, id: notebooks[i].id, creationDate: notebooks[i].created_at };
  });

  return (
    <UserNotebookPage
      initialNotebooks={initialNotebooks}
      projectId={projectId}
      vlabId={virtualLabId}
    />
  );
}
