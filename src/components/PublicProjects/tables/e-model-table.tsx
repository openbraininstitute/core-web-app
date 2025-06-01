'use client';

import { Table, TableProps } from 'antd';
import { useState } from 'react';
import { EModelProps } from '../type/artifactsType';
import columns from './columns/e-model-column';

import { classNames } from '@/util/utils';
import styles from './tables.module.scss';

export default function EModelTable({ content }: { content: any }) {
  const [selectedRow, setSelectedRow] = useState<EModelProps | null>(null);

  const rowSelection: TableProps<EModelProps>['rowSelection'] = {
    type: 'radio',
    onChange: (selectedRowKeys: React.Key[], selectedRows: EModelProps[]) => {
      setSelectedRow(selectedRows[0] || null);
    },
  };

  console.log('EModelTable content:', content);

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
          'fixed right-4 bg-primary-9 px-6 py-3 text-lg text-white transition-all duration-500 ease-in-out',
          selectedRow ? 'bottom-4' : 'bottom-[-100px]'
        )}
        type="button"
        onClick={() => console.log(selectedRow)}
        aria-label="Download selected model"
      >
        Download Model
      </button>
    </div>
  );
}
