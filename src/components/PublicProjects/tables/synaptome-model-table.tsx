'use client';

import { Table } from 'antd';
import { SynaptomeProps } from '../type/artifactsType';
import columns from './columns/synaptome-columns';

import styles from './tables.module.scss';

export default function SynaptomeTable({ content }: { content: SynaptomeProps[] }) {
  return (
    <div>
      <Table
        className={styles.circuitTable}
        dataSource={content}
        columns={columns()}
        rowKey={(record, index) => `${record.name}_${index}`}
        pagination={false}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
