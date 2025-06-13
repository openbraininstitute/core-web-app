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
          'bg-primary-9 fixed right-4 px-10 py-3 text-lg text-white transition-all duration-500 ease-in-out',
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
