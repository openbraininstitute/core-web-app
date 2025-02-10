import JSZip from 'jszip';
import { z } from 'zod';
import capitalize from 'lodash/capitalize';
import { assertErrorMessage } from '../utils';

export const options = {
  headers: {
    Accept: 'application/vnd.github.v3+json',
  },

  next: {
    revalidate: 3600 * 24,
  },
};

export interface Notebook {
  id: string;
  key: string;
  name: string;
  description: string;
  scale: string;
  path: string;
  notebookUrl: string;
  metadataUrl: string;
  readmeUrl: string;
  author: string;
  githubUser: string;
  githubRepo: string;
  creationDate: string | null;
  defaultBranch: string;
  objectOfInterest: string;
}

type Item = {
  url: string;
  path: string;
};

function assertGithubApiResponse(res: Response) {
  if (res.headers.get('x-ratelimit-remaining') === '0') {
    throw new Error('GitHub API Rate limit reached');
  }
}

export default async function fetchNotebooks(repoUrl: string): Promise<Notebook[]> {
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
      const scale = parts[parts.length - 3] ?? '';
      const name = capitalize(parts[parts.length - 2].replaceAll('_', ' ')) ?? '';

      datePromises.push(getFileCreationDate(repoDetails.user, repoDetails.repo, item.path));
      try {
        const metadataUrl =
          items[item.path.substring(0, item.path.lastIndexOf('/')) + '/analysis_info.json'].url;

        const metadata = validateMetadata(await fetchGithubFile(metadataUrl));

        notebooks.push({
          id: '', // OBI notebooks have no id in the database
          scale,
          path: item.path,
          name,
          notebookUrl: item.url,
          metadataUrl,
          readmeUrl: items[item.path.substring(0, item.path.lastIndexOf('/')) + '/README.md'].url,
          key: item.path,
          description: '',
          author: 'OBI',
          creationDate: '',
          githubUser: repoDetails.user,
          githubRepo: repoDetails.repo,
          defaultBranch,
          objectOfInterest: metadata.input.flatMap((i) => i.data_type.artefact).join(', '),
        });
      } catch {
        throw new Error(
          `Error fetching or validating metafata for notebook ${repoUrl} ${item.path}`
        );
      }
    }
  }

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
    console.error(assertErrorMessage(e));
    return repoUrl;
  }
}

async function getFileCreationDate(
  user: string,
  repo: string,
  filePath: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${user}/${repo}/commits?path=${encodeURIComponent(
    filePath
  )}&per_page=1`;

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(
        `GitHub API request failed with status: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const commits = await response.json();

    if (commits.length === 0) {
      console.error(`No commits found for file: ${filePath}`);
      return null;
    }

    const firstCommit = commits[0];
    const creationDate = firstCommit.commit.committer.date;
    return creationDate;
  } catch (error) {
    console.error('Error fetching commit history:', error);
    return null;
  }
}

export async function fetchGithubFile(url: string) {
  const response = await fetch(url, options);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to file ${url}`);
  }

  try {
    return atob(data.content);
  } catch (e) {
    throw new Error(`Failed to parse contents of ${url}`);
  }
}

export async function fetchRawGithubFile(url: string) {
  const response = await fetch(url, options);

  const data = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to file ${url}`);
  }

  try {
    return data;
  } catch (e) {
    throw new Error(`Failed to parse contents of ${url}`);
  }
}

export async function downloadZippedNotebook(notebook: Notebook) {
  try {
    const zip = new JSZip();

    const files = [notebook.metadataUrl, notebook.notebookUrl, notebook.readmeUrl];
    const names = ['analysis_info.json', 'analysis_notebook.ipynb', 'readme.md'];

    const promises = files.map(async (f, i) => {
      const response = await fetch(f);
      const data = await response.json();

      const decodedContent = atob(data.content);
      const arrayBuffer = new Uint8Array(decodedContent.length);
      for (let j = 0; j < decodedContent.length; j++) {
        arrayBuffer[i] = decodedContent.charCodeAt(i);
      }
      zip.file(names[i], arrayBuffer);
    });

    await Promise.all(promises);

    const zipContent = await zip.generateAsync({ type: 'blob' });
    return zipContent;
  } catch {
    throw new Error(`Failed to fetch the contents`);
  }
}

function extractUserAndRepo(githubUrl: string): { user: string; repo: string } {
  try {
    const url = new URL(githubUrl);

    if (url.hostname !== 'github.com') {
      throw new Error('Not a GitHub URL');
    }

    const pathParts = url.pathname.split('/').filter((part) => part.length > 0);

    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub URL: Missing user or repository');
    }

    const user = pathParts[0];
    const repo = pathParts[1];

    return { user, repo };
  } catch (error) {
    throw new Error('Invalid GitHub URL');
  }
}

export async function fetchMultipleRepos(githubUrl: string[]) {
  const promises = githubUrl.map((u) => fetchNotebooks(u));

  const results = await Promise.all(promises);

  return results.flat();
}

function validateMetadata(input: string) {
  const json = JSON.parse(input);

  try {
    const dataTypeSchema = z
      .object({
        artefact: z.union([z.string().transform((val) => [val]), z.array(z.string())]),
        required_properties: z.array(z.string()),
      })
      .strip();

    const inputItemSchema = z
      .object({
        data_type: dataTypeSchema,
        class: z.string(),
      })
      .strip();

    const inputSchema = z
      .object({
        input: z.array(inputItemSchema),
      })
      .strip();
    return inputSchema.parse(json);
  } catch (e) {
    throw new Error('Invalid metadata');
  }
}

const validScales = ['cellular', 'circuit', 'system'];

export async function fetchNotebook(
  githubUrl: string
): Promise<Omit<Notebook, 'id' | 'creationDate'>> {
  const regex = /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)/;
  const match = githubUrl.match(regex);

  if (!match) {
    throw new Error(
      'Github URL should point to a folder with a notebook including Readme.md, analysis_notebook.ipynb and metadata.json'
    );
  }

  const [, owner, repo, branch, path] = match;

  const pathParts = githubUrl.split('/');
  const scale = pathParts[pathParts.length - 2] ?? '';
  const name = capitalize(pathParts[pathParts.length - 1].replaceAll('_', ' ')) ?? '';

  if (!scale) {
    throw new Error(
      'Cannot parse scale from path. Ensure folder path follows  .../scale/name/analysis_info.json'
    );
  }

  if (!validScales.includes(scale.toLocaleLowerCase())) {
    throw new Error(`Invalid scale: should be one of ${validScales.join(', ')}.\n Found: ${scale}`);
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  const response = await fetch(apiUrl, options);

  if (!response.ok) {
    assertGithubApiResponse(response);
    throw new Error('Failed to fetch the notebook. Ensure notebook is public');
  }

  const data: {
    name: string;
    sha: string;
    path: string;
  }[] = await response.json();

  const notebookFiles = ['analysis_info.json', 'analysis_notebook.ipynb', 'README.md'];

  type Files = Record<
    string,
    {
      fileUrl: string;
      path: string;
      name: string;
    }
  >;

  const files: Files = data.reduce((acc, item) => {
    if (notebookFiles.includes(item.name) && item.sha && item.name) {
      acc[item.name] = {
        fileUrl: `https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`,
        path: `${owner}/${repo}/${item.path}`,
        name: item.name,
      };
    }
    return acc;
  }, {} as Files);

  notebookFiles.forEach((k) => {
    if (files[k] === undefined)
      throw new Error(`Cannot find ${k} for notebook ${owner}/${repo}/${path}`);
  });

  let metadataContent = '';

  try {
    metadataContent = await fetchGithubFile(files['analysis_info.json'].fileUrl);
  } catch {
    throw new Error(`Failed to download metadata file for notebook ${owner}/${repo}/${path}`);
  }

  let metadata: ReturnType<typeof validateMetadata>;

  try {
    metadata = validateMetadata(metadataContent);
  } catch {
    throw new Error(`Invalid metadata file for notebook ${owner}/${repo}/${path}`);
  }

  return {
    key: `${owner}/${repo}/${path}`,
    name,
    description: '',
    notebookUrl: files['analysis_notebook.ipynb'].fileUrl,
    readmeUrl: files['README.md'].fileUrl,
    metadataUrl: files['analysis_info.json'].fileUrl,
    scale,
    path: `${path}/${files['analysis_notebook.ipynb'].name}`,
    author: owner,
    githubUser: owner,
    githubRepo: repo,
    defaultBranch: branch,
    objectOfInterest: metadata.input.flatMap((i) => i.data_type.artefact).join(', '),
  };
}
