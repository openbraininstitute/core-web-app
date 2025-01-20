import { Suspense, useMemo } from 'react';
import DiscoverObpPanel from '@/components/VirtualLab/DiscoverObpPanel';

import VirtualLabHome from '@/components/VirtualLab/VirtualLabHomePage';
import VirtualLabUsers from '@/components/VirtualLab/VirtualLabHomePage/VirtualLabUsers';
import { ServerSideComponentProp } from '@/types/common';
import NewProjectCTABanner from '@/components/VirtualLab/VirtualLabCTABanner/NewProjectCTABanner';
import Link from 'next/link';
import { Table, ConfigProvider, Spin } from 'antd';
import { ColumnsType, ColumnType } from 'antd/es/table';
import { sorter } from '@/util/common';
import { atom, useAtom } from 'jotai';
import { memoize } from '@/util/utils';
import { useLoadable } from '@/hooks/hooks';
import { loadable } from 'jotai/utils';
import { LoadingOutlined } from '@ant-design/icons';
import NotebookTable from './NotebookTable';

export default async function VirtualLab({
  params,
}: ServerSideComponentProp<{ virtualLabId: string }>) {
  const { virtualLabId } = params;
  const fileList = await fetchFiles('');
  return <NotebookTable files={fileList} />;
}

const repoOwner = 'Naereen';
const repoName = 'notebooks';
const apiBaseUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/`;

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

async function fetchFiles(path: string = '', page: number = 1): Promise<string[]> {
  const response = await fetch(apiBaseUrl + path + `?page=${page}&per_page=100`, {
    headers: {
      Authorization: `Bearer: ${'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'}`,
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
      const nestedFiles = await fetchFiles(item.path);
      allFiles.push(...nestedFiles);
    }
  }

  // Check for next page in the Link header
  const linkHeader = response.headers.get('link');
  if (linkHeader && linkHeader.includes('rel="next"')) {
    const nextPageFiles = await fetchFiles(path, page + 1);
    allFiles.push(...nextPageFiles);
  }

  return allFiles;
}
