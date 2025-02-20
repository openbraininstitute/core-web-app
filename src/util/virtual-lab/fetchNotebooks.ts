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
  try {
    const repoDetails = extractUserAndRepo(repoUrl);

    const apiBaseUrl = `https://api.github.com/repos/${repoDetails.user}/${repoDetails.repo}`;

    const repoRes = await fetch(apiBaseUrl, options);

    if (!repoRes.ok) {
      assertGithubApiResponse(repoRes);
      throw new Error(`Cannot fetch the repository ${repoUrl}, please ensure it's public.`);
    }
    const repository = await repoRes.json();

    const defaultBranch = repository.default_branch;

    if (!defaultBranch)
      throw new Error(`Failed to fetch the repository ${repoUrl}, please ensure it's public.`);

    const response = await fetch(apiBaseUrl + `/git/trees/${defaultBranch}?recursive=1`, options);

    if (!response.ok) {
      throw new Error(`Cannot fetch the repository ${repoUrl}, ensure the repository is public.`);
    }

    const tree: { tree: Item[] } = await response.json();

    if (!tree.tree)
      throw new Error(`Cannot fetch the repository ${repoUrl}, ensure the repository is public.`);

    const notebooks: Notebook[] = [];

    const datePromises: Promise<string | null>[] = [];

    const items = tree.tree.reduce<Record<string, Item>>((acc, item) => {
      acc[item.path] = item;
      return acc;
    }, {});

    for (const item of Object.values(items)) {
      if (item.path.endsWith('analysis_notebook.ipynb')) {
        if (withDate)
          datePromises.push(getFileCreationDate(repoDetails.user, repoDetails.repo, item.path));

        try {
          const metadataUrl =
            items[item.path.substring(0, item.path.lastIndexOf('/')) + '/analysis_info.json'].url;

          const metadata = validateMetadata(await fetchGithubFile(metadataUrl));

          notebooks.push({
            id: '', // OBI notebooks have no id in the database
            scale: capitalize(metadata.scale),
            path: item.path,
            name: metadata.name,
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

    if (!withDate) return { notebooks, error: '' };

    const dates = await Promise.all(datePromises);

    return {
      notebooks: notebooks.map((n, i) => {
        // eslint-disable-next-line
        n.creationDate = dates[i];
        return n;
      }),
      error: '',
    };
  } catch (e) {
    return { notebooks: [], error: assertErrorMessage(e) };
  }
}

export async function fetchNotebookCount(repoUrl: string) {
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

  return tree.tree.filter((i) => i.path.endsWith('ipynb')).length;
}
