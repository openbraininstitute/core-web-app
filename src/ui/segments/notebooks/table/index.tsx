'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { ConfigProvider } from 'antd';
import Table from 'antd/es/table';
import dynamic from 'next/dynamic';
import ContentModal from './content-modal';
import FilterSection from './filter-section';
import { useTableColumns } from './table-columns';
import TableStyles from './table-styles';
import { useNotebookTable } from './use-notebook-table';
import { Notebook } from '@/util/virtual-lab/types';
import { startNotebook, NotebookStartResponse } from '@/services/notebooks';

import { useFilters, useToggleColumns } from '@/components/FilterControls/Filter';
import { Notebook } from '@/util/virtual-lab/types';

export function NotebookTable({
  notebooks,
  failed,
  onDelete,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vlabId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  projectId,
  serverError,
}: {
  vlabId?: string;
  projectId?: string;
  notebooks: Notebook[];
  failed?: string[];
  onDelete?: (id: string) => void;
  serverError?: string;
}) {
  const {
    loadingZip,
    currentNotebook,
    display,
    Search,
    filteredNotebooks,
    resetModal,
    handleDownloadClick,
    handleReadmeClick,
    runOnEksNotebook,
  } = useNotebookTable(notebooks, failed, serverError);

  // Get table columns
  const columns = useTableColumns({
    loadingZip,
    onReadmeClick: handleReadmeClick,
    onDownloadClick: handleDownloadClick,
    onDeleteClick: onDelete,
    onRunOnEksClick: runOnEksNotebook,
  });

  // Column toggle functionality
  const { filteredColumns, toggleColumn, isColumnHidden } = useToggleColumns(columns);

  // Filter functionality
  const { filteredData, onDateChange, filterCount, onChange, onFilterReset, filterValue } =
    useFilters(filteredNotebooks);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorBgContainer: '#002766',
          colorBorderSecondary: 'transparent',
          colorText: '#fff',
          colorTextHeading: '#BAE7FF',
        },
      }}
    >
      <div className="flex items-center justify-between">
        {Search}
        <FilterSection
          filteredColumns={filteredColumns}
          filterCount={filterCount}
          filterValue={(key: string) => filterValue(key as keyof Notebook)}
          onChange={(key: string, value: any) => onChange(key as keyof Notebook, value)}
          onDateChange={(key: string, values: any) => onDateChange(key as keyof Notebook, values)}
          onFilterReset={onFilterReset}
          toggleColumn={toggleColumn}
          isColumnHidden={isColumnHidden}
        />
      </div>

      <div id="table-container">
        <Table
          dataSource={filteredData}
          columns={filteredColumns}
          pagination={false}
          locale={{ emptyText: <div className="mt-5 text-lg text-gray-400">No data</div> }}
        />
      </div>

      <ContentModal notebook={currentNotebook} display={display} onCancel={resetModal} />
      <TableStyles />
    </ConfigProvider>
  );
}

export default dynamic(() => Promise.resolve(NotebookTable), {
  ssr: false,
  loading: () => (
    <div className="flex grow items-center justify-center text-3xl text-white">
      <LoadingOutlined />
    </div>
  ),
});
