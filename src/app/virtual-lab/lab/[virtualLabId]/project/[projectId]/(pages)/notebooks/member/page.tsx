import { z } from 'zod';
import NotebookTable from '../NotebookTable';
import { ServerSideComponentProp } from '@/types/common';
import { fetchNotebook } from '@/util/virtual-lab/github';
import { virtualLabApi } from '@/config';
import { assertVLApiResponse } from '@/util/utils';
import UserNotebookPage from './UserNotebookPage';

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
}: ServerSideComponentProp<{ projectId: string }>) {
  const { projectId } = params;

  // let userNotebookData: any;

  // try {
  //   const userNotebooksRes = await fetch(
  //     `${virtualLabApi.url}/projects/${projectId}/notebooks?page_size=100`
  //   );

  //   userNotebookData = await assertVLApiResponse(userNotebooksRes);
  // } catch {
  //   throw new Error(`Failed to fetch notebooks for project ${projectId}`);
  // }

  // let notebooks: ReturnType<typeof NotebooksArraySchema.parse>;

  // try {
  //   notebooks = NotebooksArraySchema.parse(userNotebookData);
  // } catch {
  //   throw new Error(`Failed to validate data for notebooks`);
  // }

  // const githubFolderUrl =
  //   'https://github.com/openbraininstitute/obi_platform_analysis_notebooks/tree/main/Cellular/display_morphology_population_features';

  const notebooks = [
    {
      github_file_url:
        'https://github.com/openbraininstitute/obi_platform_analysis_notebooks/tree/main/Cellular/display_morphology_population_features',
    },
  ];

  const notebooksPromises = notebooks.map((n) => fetchNotebook(n.github_file_url));
  const validatedNotebooks = await Promise.all(notebooksPromises);
  validatedNotebooks.forEach((n, i) => {
    n.creationDate = notebooks[i].created_at; // eslint-disable-line no-param-reassign
  });

  return <UserNotebookPage initialNotebooks={validatedNotebooks} projectId={projectId} />;
}
