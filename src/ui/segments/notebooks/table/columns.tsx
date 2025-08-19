import { Column } from '@/components/FilterControls/ControlPanel';
import renderActionColumns from '@/ui/segments/notebooks/table/render-action-columns';
import { Notebook } from '@/util/virtual-lab/types';
import { getSorter } from '@/utils/get-sorter';
import { Tooltip } from 'antd';
import { compareAsc, format } from 'date-fns';

const columns: Column<Notebook>[] = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    sorter: getSorter('name'),
    render: (text) => <div className="line-clamp-2 max-w-[60em] font-bold">{text}</div>,
  },

  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    sorter: getSorter('description'),
    render: (text) => (
      <Tooltip title={text}>
        <div className="line-clamp-2 max-w-[40em]">{text}</div>
      </Tooltip>
    ),
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
    render: (text) => (
      <Tooltip title={text}>
        <div className="line-clamp-1 max-w-[50em]">{text}</div>
      </Tooltip>
    ),
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

export default columns;
