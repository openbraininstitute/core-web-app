'use client';

import { Table, TableProps } from 'antd';
import { useState } from 'react';
import { SynaptomeProps } from '../type/artifactsType';
import columns from './columns/synaptome-columns';

import { classNames } from '@/util/utils';
import styles from './tables.module.scss';

export default function SynaptomeTable({ content }: { content: SynaptomeProps[] }) {
  const [selectedRow, setSelectedRow] = useState<SynaptomeProps | null>(null);

  const rowSelection: TableProps<SynaptomeProps>['rowSelection'] = {
    type: 'radio',
    onChange: (selectedRowKeys: React.Key[], selectedRows: SynaptomeProps[]) => {
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
