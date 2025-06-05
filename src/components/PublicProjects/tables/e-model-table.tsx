'use client';

import { Table, TableProps } from 'antd';
import { Key, useState } from 'react';
import { EModelsProps } from '../type/artifactsType';
import columns from './columns/e-model-columns';

import { classNames } from '@/util/utils';
import styles from './tables.module.scss';

export default function EModelTable({ content }: { content: EModelsProps[] }) {
  const [selectedRow, setSelectedRow] = useState<EModelsProps | null>(null);

  const rowSelection: TableProps<EModelsProps>['rowSelection'] = {
    type: 'radio',
    onChange: (selectedRowKeys: Key[], selectedRows: EModelsProps[]) => {
      setSelectedRow(selectedRows[0] || null);
    },
  };

  const handleDownload = () => {
    if (selectedRow?.downloadLink) {
      const link = document.createElement('a');
      link.href = selectedRow.download ?? '';
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
        rowKey={(record, index) => `${record.name}_${index}`}
        pagination={false}
        rowSelection={rowSelection}
        scroll={{ x: 'max-content' }}
      />

      <button
        className={classNames(
          'fixed right-4 bg-green-600 px-10 py-3 text-lg text-white transition-all duration-500 ease-in-out',
          selectedRow ? 'bottom-4' : 'bottom-[-100px]'
        )}
        type="button"
        onClick={handleDownload}
        aria-label="Download selected model"
      >
        Download Model
      </button>
    </div>
  );
}
