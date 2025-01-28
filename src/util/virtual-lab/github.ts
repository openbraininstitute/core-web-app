import JSZip from 'jszip';
import { notebookRepository } from '@/config';

const apiBaseUrl = `https://api.github.com/repos/${notebookRepository.user}/${notebookRepository.repository}`;

export const options = {
  headers: {
    Authorization: 'token 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',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  next: {
    revalidate: 3600 * 24,
  },
};

export interface Notebook {
  key: string;
  name: string;
  description: string;
  objectOfInterest: string;
  fileName: string;
  author: string;
  creationDate: string | null;
}

export default async function fetchNotebooks(): Promise<Notebook[]> {
  const repoRes = await fetch(apiBaseUrl, options);

  if (!repoRes.ok) {
    throw new Error(`GitHub API request failed with status: ${repoRes.status}`);
  }
  const repo = await repoRes.json();

  const defaultBranch = repo.default_branch;

  if (!defaultBranch) throw new Error(`Failed to fetch the repository`);

  const response = await fetch(apiBaseUrl + `/git/trees/${defaultBranch}?recursive=1`, options);

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status: ${response.status}`);
  }

  const tree = await response.json();
  if (!tree.tree) throw new Error(`Failed to fetch the github repo`);

  const notebooks: Notebook[] = [];

  for (const item of tree.tree) {
    if (item.path.endsWith('.ipynb')) {
      const parts = item.path.split('/');
      const objectOfInterest = parts[0];
      const name = parts[1];

      notebooks.push({
        objectOfInterest,
        name,
        fileName: item.path,
        key: item.path,
        description: '',
        author: 'OBI',
        creationDate: await getFileCreationDate(item.path),
      });
    }
  }

  return notebooks;
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

export async function fetchFile(filePath: string) {
  const url = `https://api.github.com/repos/${notebookRepository.user}/${notebookRepository.repository}/contents/${filePath}`;

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
    throw new Error(`Error fetching file ${filePath}`);
  }
}

export async function downloadZippedFolder(path: string) {
  try {
    const apiUrl = `https://api.github.com/repos/${notebookRepository.user}/${notebookRepository.repository}/contents/${path}`;
    const response = await fetch(apiUrl, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `GitHub API request failed with status: ${response.status} ${response.statusText}`
      );
    }

    const zip = new JSZip();

    for (const file of data) {
      if (file.type === 'file') {
        const fileData = await fetch(file.download_url, options);
        const arrayBuffer = await fileData.arrayBuffer();
        zip.file(file.name, arrayBuffer);
      }
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    return zipContent;
  } catch {
    throw new Error(`Failed to fetch the contents`);
  }
}
