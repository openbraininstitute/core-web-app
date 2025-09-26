'use client';

import { compareAsc, format } from 'date-fns';
import ActionPopover from './ActionPopover';
import { getSorter } from './utils';
import { Notebook } from '@/util/virtual-lab/types';
import { Column } from '@/components/FilterControls/ControlPanel';

interface TableColumnsProps {
  loadingZip: boolean;
  onReadmeClick: (notebook: Notebook) => void;
  onDownloadClick: (notebook: Notebook) => void;
  onDeleteClick?: (id: string) => void;
  onRunClick?: (notebook: Notebook) => void;
  enableRunNotebook?: boolean;
  onRunOnEksClick?: (notebook: Notebook) => void;
}

export function useTableColumns({
  loadingZip,
  onReadmeClick,
  onDownloadClick,
  onDeleteClick,
  onRunClick,
  enableRunNotebook,
  onRunOnEksClick,
}: TableColumnsProps): Column<Notebook>[] {
  const renderActionColumns = (_: string, notebook: Notebook) => {
    return (
      <ActionPopover
        notebook={notebook}
        loadingZip={loadingZip}
        onReadmeClick={onReadmeClick}
        onDownloadClick={onDownloadClick}
        onDeleteClick={onDeleteClick}
        onRunClick={onRunClick}
        enableRunNotebook={enableRunNotebook}
        onRunOnEksClick={onRunOnEksClick}
      />
    );
  };

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
      render: (text) => <div className="line-clamp-2 max-w-[40em]">{text}</div>,
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
      render: (date: string | null) => (date ? format(date, 'dd.MM.yyyy') : '-'),
      sorter: (a, b) => {
        if (a.creationDate === null && b.creationDate === null) {
          return 0;
        }
        if (a.creationDate === null) {
          return 1;
        }
        if (b.creationDate === null) {
          return -1;
        }
        return compareAsc(new Date(a.creationDate), new Date(b.creationDate));
      },
    },
    {
      dataIndex: 'notebookUrl',
      key: 'notebookUrl',
      render: renderActionColumns,
    },
  ];
}
