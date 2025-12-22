'use client';

import { Table, TableProps } from 'antd';
import { Key, useState } from 'react';

import columns from '@/ui/segments/reports/obi-showcases/artifacts/columns/me-model-column';
import { MEModelsProps } from '@/ui/segments/reports/obi-showcases/showcase-type';

import { classNames } from '@/util/utils';

import styles from '@/ui/segments/reports/obi-showcases/artifacts/styles/me-model.module.css';

export default function MEModelTable({ content }: { content: MEModelsProps[] }) {
  const [selectedRow, setSelectedRow] = useState<MEModelsProps | null>(null);

  const rowSelection: TableProps<MEModelsProps>['rowSelection'] = {
    type: 'radio',
    onChange: (selectedRowKeys: Key[], selectedRows: MEModelsProps[]) => {
      setSelectedRow(selectedRows[0] || null);
    },
  };

  const handleDownload = () => {
    if (selectedRow?.download) {
      window.open(selectedRow.download, '_blank');
    }
  };

  return (
    <div>
      <Table
        className={styles.circuitTable}
        dataSource={content}
        columns={columns()}
        rowKey={(record, index) => `${record.name}_${index}`}
        pagination={false}
        rowSelection={rowSelection}
        scroll={{ x: 'max-content' }}
      />

      <button
        className={classNames(
          'fixed right-8 bg-green-600 px-10 py-4 text-lg font-normal text-white transition-all duration-500 ease-in-out',
          selectedRow ? 'bottom-8' : 'bottom-[-100px]'
        )}
        type="button"
        name="download-model"
        onClick={handleDownload}
        aria-label="Download selected model"
      >
        Download Model
      </button>
    </div>
  );
}
