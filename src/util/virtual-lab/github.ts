'use server';

import path from 'path';
import capitalize from 'lodash/capitalize';
import JSZip from 'jszip';
import { assertGithubApiResponse, Notebook, validateMetadata } from './types';
import { env } from '@/env';

const options = {
  headers: {
    Accept: 'application/vnd.github.v3+json',
    ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
  },

  next: {
    revalidate: 3600,
  },
};

export async function getFileCreationDate(
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
      // eslint-disable-next-line no-console
      console.error(
        `GitHub API request failed with status: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const commits = await response.json();

    if (commits.length === 0) {
      // eslint-disable-next-line no-console
      console.error(`No commits found for file: ${filePath}`);
      return null;
    }

    const firstCommit = commits[0];
    const creationDate = firstCommit.commit.committer.date;
    return creationDate;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching commit history:', error);
    return null;
  }
}

export async function fetchGithubFile(url: string) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Failed to fetch file ${url}`);
  }

  const data = await response.json();

  try {
    const binaryString = atob(data.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new TextDecoder('utf-8').decode(bytes);
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
      const response = await fetch(f, options);

      const data = await response.json();

      const decodedContent = atob(data.content);

      const arrayBuffer = new Uint8Array(decodedContent.length);
      for (let j = 0; j < decodedContent.length; j++) {
        arrayBuffer[j] = decodedContent.charCodeAt(j);
      }

      zip.file(names[i], arrayBuffer);
    });

    await Promise.all(promises);

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    return zipContent;
  } catch (e) {
    throw new Error(`Failed to fetch the contents`);
  }
}

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

  const [, owner, repo, branch, nPath] = match;

  const directory = path.dirname(nPath);

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${directory}?ref=${branch}`;

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
      throw new Error(`Cannot find ${k} for notebook ${owner}/${repo}/${nPath}`);
  });

  let metadataContent = '';

  try {
    metadataContent = await fetchGithubFile(files['analysis_info.json'].fileUrl);
  } catch {
    throw new Error(`Failed to download metadata file for notebook ${owner}/${repo}/${nPath}`);
  }

  let metadata: ReturnType<typeof validateMetadata>;

  try {
    metadata = validateMetadata(metadataContent);
  } catch (e) {
    throw new Error(`Invalid metadata file for notebook ${owner}/${repo}/${nPath}` + e);
  }

  return {
    key: `${owner}/${repo}/${nPath}`,
    name: metadata.name,
    description: metadata.description,
    notebookUrl: files['analysis_notebook.ipynb'].fileUrl,
    readmeUrl: files['README.md'].fileUrl,
    metadataUrl: files['analysis_info.json'].fileUrl,
    scale: capitalize(metadata.scale),
    path: `${directory}/${files['analysis_notebook.ipynb'].name}`,
    authors: metadata.authors.join(', '),
    githubUser: owner,
    githubRepo: repo,
    defaultBranch: branch,
    objectOfInterest: metadata.input.flatMap((i) => i.data_type.artefact).join(', '),
  };
}
