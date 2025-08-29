'use client';

import { compareAsc, format } from 'date-fns';
import ActionMenu, { BuildColumnsArgs } from './action-menu';
import { getSorter } from './utils';

import { Column } from '@/components/FilterControls/ControlPanel';
import { Notebook } from '@/util/virtual-lab/types';

export function buildColumns({
  onShowReadme,
  onDownload,
  onDelete,
  onRun,
  enableRunNotebook,
  loading,
}: BuildColumnsArgs): Column<Notebook>[] {
  return [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: getSorter('name'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: getSorter('description'),
      render: (text: string) => <div className="line-clamp-2 max-w-[40em]">{text}</div>,
    },
    {
      title: 'Object of interest',
      dataIndex: 'objectOfInterest',
      key: 'objectOfInterest',
      sorter: getSorter('objectOfInterest'),
    },
    {
      title: 'Scale',
      dataIndex: 'scale',
      key: 'scale',
      sorter: getSorter('scale'),
    },
    {
      title: 'Authors',
      dataIndex: 'authors',
      key: 'authors',
      sorter: getSorter('authors'),
    },
    {
      title: 'Creation date',
      dataIndex: 'creationDate',
      key: 'creationDate',
      render: (date: string | null) => (date ? format(new Date(date), 'dd.MM.yyyy') : '-'),
      sorter: (a, b) => {
        if (a.creationDate === null && b.creationDate === null) return 0;
        if (a.creationDate === null) return 1;
        if (b.creationDate === null) return -1;
        return compareAsc(new Date(a.creationDate), new Date(b.creationDate));
      },
    },
    {
      dataIndex: 'notebookUrl',
      key: 'notebookUrl',
      render: (_: string, notebook: Notebook) => (
        <ActionMenu
          notebook={notebook}
          loadingZip={loading}
          onShowReadme={onShowReadme}
          onDownload={onDownload}
          onDelete={onDelete}
          onRun={onRun}
          enableRunNotebook={enableRunNotebook}
        />
      ),
    },
  ];
}
