import JSZip from 'jszip';
import { assertErrorMessage } from '../utils';
import { notebookRepository } from '@/config';

const apiBaseUrl = `https://api.github.com/repos/${notebookRepository.user}/${notebookRepository.repository}`;

export const options = {
  next: {
    revalidate: 3600 * 24,
  },
};

export interface Notebook {
  key: string;
  name: string;
  description: string;
  objectOfInterest: string;
  path: string;
  notebookUrl: string;
  metadataUrl: string;
  readmeUrl: string;
  author: string;
  githubUser: string;
  githubRepo: string;
  creationDate: string | null;
  defaultBranch: string;
}

type Item = {
  url: string;
  path: string;
};

export default async function fetchNotebooks(): Promise<Notebook[]> {
  const repoRes = await fetch(apiBaseUrl, options);

  if (!repoRes.ok) {
    if (repoRes.headers.get('x-ratelimit-remaining') === '0') {
      throw new Error('GitHub API Rate limit reached');
    }
    throw new Error('Cannot fetch the notebooks, ensure the notebook is public');
  }
  const repo = await repoRes.json();

  const defaultBranch = repo.default_branch;

  if (!defaultBranch) throw new Error(`Failed to fetch the repository`);

  const response = await fetch(apiBaseUrl + `/git/trees/${defaultBranch}?recursive=1`, options);

  if (!response.ok) {
    throw new Error('Cannot fetch the notebooks, ensure the notebook is public');
  }

  const tree: { tree: Item[] } = await response.json();

  if (!tree.tree) throw new Error(`Failed to fetch the github repo`);

  const notebooks: Notebook[] = [];

  const datePromises: Promise<string | null>[] = [];

  const items = tree.tree.reduce<Record<string, Item>>((acc, item) => {
    acc[item.path] = item;
    return acc;
  }, {});

  for (const item of Object.values(items)) {
    if (item.path.endsWith('.ipynb')) {
      const parts = item.path.split('/');
      const objectOfInterest = parts[0];
      const name = parts[1];

      datePromises.push(getFileCreationDate(item.path));

      try {
        notebooks.push({
          objectOfInterest,
          path: item.path,
          name,
          notebookUrl: item.url,
          metadataUrl:
            items[item.path.substring(0, item.path.lastIndexOf('/')) + '/analysis_info.json'].url,
          readmeUrl: items[item.path.substring(0, item.path.lastIndexOf('/')) + '/README.md'].url,
          key: item.path,
          description: '',
          author: 'OBI',
          creationDate: '',
          githubUser: notebookRepository.user,
          githubRepo: notebookRepository.repository,
          defaultBranch,
        });
      } catch {
        throw new Error(`Metadata file missing for notebook ${item.path}`);
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

export async function fetchNotebooksCatchError(): Promise<Notebook[]> {
  try {
    return await fetchNotebooks();
  } catch (e) {
    console.error(assertErrorMessage(e));
    return [];
  }
}

async function getFileCreationDate(filePath: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${notebookRepository.user}/${notebookRepository.repository}/commits?path=${encodeURIComponent(
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
      console.log(`No commits found for file: ${filePath}`);
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
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `GitHub API request failed with status: ${response.status} ${response.statusText}`
      );
    }

    return atob(data.content);
  } catch {
    throw new Error(`Error fetching file.`);
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
