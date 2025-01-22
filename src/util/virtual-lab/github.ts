import JSZip from 'jszip';
import { notebookRepository } from '@/config';

const apiBaseUrl = `https://api.github.com/repos/${notebookRepository.user}/${notebookRepository.repository}/contents/`;

export const options = {
  headers: {
    Authorization: 'Bearer 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',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  next: {
    revalidate: 3600 * 24,
  },
};

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

export interface Notebook {
  key: string;
  name: string;
  description: string;
  objectOfInterest: string;
  fileName: string;
  author: string;
  creationDate: string | null;
}

export default async function fetchNotebooks(
  path: string = '',
  page: number = 1
): Promise<Notebook[]> {
  const response = await fetch(apiBaseUrl + path + `?page=${page}&per_page=1000`, options);

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status: ${response.status}`);
  }

  const items: GitHubFile[] = await response.json();
  const notebooks: Notebook[] = [];

  for (const item of items) {
    if (item.type === 'file' && item.path.endsWith('.ipynb')) {
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
    } else if (item.type === 'dir') {
      const nestedFiles = await fetchNotebooks(item.path);
      notebooks.push(...nestedFiles);
    }
  }

  // Check for next page in the Link header
  const linkHeader = response.headers.get('link');
  if (linkHeader && linkHeader.includes('rel="next"')) {
    const nextPageFiles = await fetchNotebooks(path, page + 1);
    notebooks.push(...nextPageFiles);
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
