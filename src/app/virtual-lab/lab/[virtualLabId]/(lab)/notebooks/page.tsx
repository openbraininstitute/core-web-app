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
import fetchNotebooks from '@/util/virtual-lab/github';

export default async function Notebooks({
  params,
}: ServerSideComponentProp<{ virtualLabId: string }>) {
  const { virtualLabId } = params;
  const notebooks = await fetchNotebooks('');
  return <NotebookTable notebooks={notebooks} />;
}
