'use client';

import { Table, TableProps } from 'antd';
import { Key, useState } from 'react';
import { MEModelsProps } from '../type';
import columns from './columns/me-model-columns';

import { classNames } from '@/util/utils';

import styles from './tables.module.scss';

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
      const link = document.createElement('a');
      link.href = selectedRow.download;
      link.download = selectedRow.name || 'model';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div>
      <Table
        className={styles.circuitTable}
        dataSource={content}
        columns={columns()}
        rowKey="name"
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
