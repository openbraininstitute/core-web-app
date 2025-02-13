'use server';

import capitalize from 'lodash/capitalize';
import { assertErrorMessage } from '../utils';

import {
  assertGithubApiResponse,
  extractUserAndRepo,
  Notebook,
  Item,
  validateMetadata,
  fetchGithubFile,
  options,
  getFileCreationDate,
} from './github';

export default async function fetchNotebooks(repoUrl: string, withDate = false) {
  const repoDetails = extractUserAndRepo(repoUrl);

  const apiBaseUrl = `https://api.github.com/repos/${repoDetails.user}/${repoDetails.repo}`;

  const repoRes = await fetch(apiBaseUrl, options);

  if (!repoRes.ok) {
    assertGithubApiResponse(repoRes);
    throw new Error(`Cannot fetch the repository ${repoUrl}`);
  }
  const repository = await repoRes.json();

  const defaultBranch = repository.default_branch;

  if (!defaultBranch) throw new Error(`Failed to fetch the repository ${repoUrl}`);

  const response = await fetch(apiBaseUrl + `/git/trees/${defaultBranch}?recursive=1`, options);

  if (!response.ok) {
    throw new Error(`Cannot fetch the repository ${repoUrl} , ensure the repository is public`);
  }

  const tree: { tree: Item[] } = await response.json();

  if (!tree.tree) throw new Error(`Cannot fetch the repository ${repoUrl}`);

  const notebooks: Notebook[] = [];

  const datePromises: Promise<string | null>[] = [];

  const items = tree.tree.reduce<Record<string, Item>>((acc, item) => {
    acc[item.path] = item;
    return acc;
  }, {});

  for (const item of Object.values(items)) {
    if (item.path.endsWith('.ipynb')) {
      const parts = item.path.split('/');
      // const scale = parts[parts.length - 3] ?? '';
      const name = capitalize(parts[parts.length - 2].replaceAll('_', ' ')) ?? '';

      if (withDate)
        datePromises.push(getFileCreationDate(repoDetails.user, repoDetails.repo, item.path));

      try {
        const metadataUrl =
          items[item.path.substring(0, item.path.lastIndexOf('/')) + '/analysis_info.json'].url;

        const metadata = validateMetadata(await fetchGithubFile(metadataUrl));

        notebooks.push({
          id: '', // OBI notebooks have no id in the database
          scale: metadata.scale,
          path: item.path,
          name,
          notebookUrl: item.url,
          metadataUrl,
          readmeUrl: items[item.path.substring(0, item.path.lastIndexOf('/')) + '/README.md'].url,
          key: item.path,
          description: metadata.description,
          authors: metadata.authors.join(', '),
          creationDate: '',
          githubUser: repoDetails.user,
          githubRepo: repoDetails.repo,
          defaultBranch,
          objectOfInterest: metadata.input.flatMap((i) => i.data_type.artefact).join(', '),
        });
      } catch (e) {
        throw new Error(
          `Error fetching or validating metadata for notebook ${repoUrl} ${item.path} \n ${e}`
        );
      }
    }
  }

  if (!withDate) return notebooks;

  const dates = await Promise.all(datePromises);

  return notebooks.map((n, i) => {
    // eslint-disable-next-line
    n.creationDate = dates[i];
    return n;
  });
}

export async function fetchNotebooksCatchError(repoUrl: string): Promise<Notebook[] | string> {
  try {
    return await fetchNotebooks(repoUrl);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(assertErrorMessage(e));
    return repoUrl;
  }
}
