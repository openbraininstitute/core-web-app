'use client';

import { Table, TableProps } from 'antd';
import { Key, useState } from 'react';
import { MEModelProps } from '../type/artifactsType';
import columns from './columns/me-model-columns';

import { classNames } from '@/util/utils';

import styles from './tables.module.scss';

export default function MEModelTable({ content }: { content: MEModelProps[] }) {
  const [selectedRow, setSelectedRow] = useState<MEModelProps | null>(null);

  const rowSelection: TableProps<MEModelProps>['rowSelection'] = {
    type: 'radio',
    onChange: (selectedRowKeys: Key[], selectedRows: MEModelProps[]) => {
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
          'fixed right-4 bg-primary-9 px-10 py-3 text-lg text-white transition-all duration-500 ease-in-out',
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
