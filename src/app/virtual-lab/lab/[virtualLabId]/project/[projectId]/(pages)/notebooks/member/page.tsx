import NotebookTable from '../NotebookTable';
import { ServerSideComponentProp } from '@/types/common';
import { fetchGithubFile, fetchMultipleRepos, fetchNotebook } from '@/util/virtual-lab/github';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ projectId: string }>) {
  const { projectId } = params;

  const githubFolderUrl =
    'https://github.com/openbraininstitute/obi_platform_analysis_notebooks/tree/main/Cellular/display_morphology_population_features';

  const results = await fetchMultipleRepos([]);
  const notebooks = results.filter((r) => typeof r !== 'string').flat();
  const failed = results.filter((r) => typeof r === 'string');

  return <NotebookTable notebooks={[await fetchNotebook(githubFolderUrl)]} failed={failed} />;
}
