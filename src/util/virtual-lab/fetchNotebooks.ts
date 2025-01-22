const repoOwner = 'g-bar';
const repoName = 'obi_platform_analysis_notebooks';
const apiBaseUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/`;

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

export default async function fetchNotebooks(
  path: string = '',
  page: number = 1
): Promise<string[]> {
  const response = await fetch(apiBaseUrl + path + `?page=${page}&per_page=1000`, {
    headers: {
      Authorization: 'Bearer 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',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: {
      revalidate: 3600 * 24,
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status: ${response.status}`);
  }

  const items: GitHubFile[] = await response.json();
  const allFiles: string[] = [];

  for (const item of items) {
    if (item.type === 'file' && item.path.endsWith('.ipynb')) {
      allFiles.push(item.path);
    } else if (item.type === 'dir') {
      const nestedFiles = await fetchNotebooks(item.path);
      allFiles.push(...nestedFiles);
    }
  }

  // Check for next page in the Link header
  const linkHeader = response.headers.get('link');
  if (linkHeader && linkHeader.includes('rel="next"')) {
    const nextPageFiles = await fetchNotebooks(path, page + 1);
    allFiles.push(...nextPageFiles);
  }

  return allFiles;
}
