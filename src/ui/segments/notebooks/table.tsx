'use client';

import { ConfigProvider } from 'antd';

import { useState } from 'react';

import { LoadingOutlined } from '@ant-design/icons';
import Table from 'antd/es/table';
import dynamic from 'next/dynamic';
// @ts-ignore
import useSearch from '@/components/VirtualLab/Search';
import ContentModal from './ContentModal';

import { useFilters } from '@/components/FilterControls/Filter';
import { useAppNotification } from '@/components/notification';
import columns from '@/ui/segments/notebooks/table/columns';
import {
  NotebookColumnKey,
  useToggleColumns,
} from '@/ui/segments/notebooks/utils/use-toggle-column';
import { Notebook } from '@/util/virtual-lab/types';
import NotebookFilters from './filter-controls';
import filteredNotebooks from './utils/filtered-notebooks';

function NotebookTable({
  notebooks,
  failed,
  onDelete: _onDelete,
  vlabId: _vlabId,
  projectId: _projectId,
  serverError,
  enableRunNotebook: _enableRunNotebook = false,
}: {
  vlabId: string;
  projectId: string;
  notebooks: Notebook[];
  failed?: string[];
  onDelete?: (id: string) => void;
  serverError?: string;
  enableRunNotebook?: boolean;
}) {
  const notification = useAppNotification();
  const [_loadingZip, _setLoadingZip] = useState(false);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  const [display, setDisplay] = useState<'notebook' | 'readme' | null>(null);

  if (serverError)
    notification.error({
      message: serverError,
      key: 'notebooks-server-error',
      placement: 'topRight',
    });

  const resetModal = () => {
    setCurrentNotebook(null);
    setDisplay(null);
  };

  if (failed && failed.length)
    notification.warning({
      message:
        "Failed to fetch some repositories, ensure they're public and contain valid metadata for each notebook",
      placement: 'topRight',
    });

  const { filteredColumns, toggleColumn, isColumnHidden } = useToggleColumns(columns);

  const { search } = useSearch({
    placeholder: 'Search for notebooks',
    containerClassName: 'ml-5',
    className: 'w-[200px] placeholder:text-gray-400',
  });

  const { filteredData, onDateChange, filterCount, onChange, onFilterReset, filterValue } =
    useFilters(filteredNotebooks(notebooks, search));

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: 'transparent',
          colorBorderSecondary: 'transparent',
          colorText: '#002766',
          colorTextHeading: '#8C8C8C',
        },
      }}
    >
      <NotebookFilters
        filteredColumns={filteredColumns}
        isColumnHidden={(dataIndex: string) => isColumnHidden(dataIndex as NotebookColumnKey)}
        toggleColumn={(dataIndex: string) => toggleColumn(dataIndex as NotebookColumnKey)}
        filterCount={filterCount}
        filterValue={filterValue}
        onChange={onChange}
        onDateChange={onDateChange}
        onFilterReset={onFilterReset}
      />

      <div id="table-container" className="mt-5 w-full">
        <Table
          dataSource={filteredData}
          columns={filteredColumns}
          pagination={false}
          locale={{ emptyText: <div className="mt-5 text-lg text-gray-400">No data</div> }}
        />
      </div>

      <ContentModal notebook={currentNotebook} display={display} onCancel={resetModal} />

      <style jsx global>{`
        /* Change color of sorting icons */
        #table-container .ant-table-column-sorter-up,
        #table-container .ant-table-column-sorter-down {
          color: #002766;
        }

        #table-container .ant-table-column-sorter-up.active,
        #table-container .ant-table-column-sorter-down.active {
          color: #002766 !important;
        }

        #table-container .ant-table-thead > tr > th {
          background-color: transparent !important;
          font-weight: normal !important;
        }

        /* Remove row hover effect */
        #table-container .ant-table-tbody > tr:hover > td {
          background-color: transparent !important;
        }

        #table-container .ant-table-tbody > tr:hover {
          background-color: transparent !important;
        }

        #popover * {
          background-color: #fff !important;
        }
      `}</style>
    </ConfigProvider>
  );
}

export default dynamic(() => Promise.resolve(NotebookTable), {
  ssr: false,
  loading: () => (
    <div className="col-span-3 flex grow items-center justify-center text-3xl text-white">
      <LoadingOutlined />
    </div>
  ),
});
