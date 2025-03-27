import { Table } from 'antd';
import CIRCUIT_PLACHOLDER_DATA from '../../../content/CIRCUITS_PLACEHOLDER';
import { CircuitColumn, SingleCircuitListView } from '../../../type';

import truncate from '@/util/truncate';
import { classNames } from '@/util/utils';

export default function ParentCircuit() {
  const columns: CircuitColumn[] = [
    {
      title: 'Name',
      key: 'name',
      render: (value: SingleCircuitListView) => (
        <a href={value.key} className="whitespace-nowrap font-bold">
          {value.name}
        </a>
      ),
      width: 200,
    },
    {
      title: 'Description',
      key: 'description',
      render: (value: SingleCircuitListView) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {truncate(value.description, 60)}
        </a>
      ),
      width: 200,
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      render: (value: SingleCircuitListView) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.brainRegion}
        </a>
      ),
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      render: (value: SingleCircuitListView) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.numberOfNeurons}
        </a>
      ),
    },
    {
      title: 'Species',
      key: 'specie',
      render: (value: SingleCircuitListView) => (
        <span className="whitespace-nowrap font-normal">{value.specie}</span>
      ),
    },
    {
      title: 'Created by',
      key: 'createdBy',
      render: (value: SingleCircuitListView) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.metadata.createdBy}
        </a>
      ),
    },
    {
      title: 'Creation date',
      key: 'creationDate',
      render: (value: SingleCircuitListView) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.metadata.creationDate}
        </a>
      ),
    },
  ];

  return (
    <div className="relative flex w-full max-w-full flex-col">
      <Table<SingleCircuitListView>
        className={classNames(
          '[&_.ant-table-row]:bg-[#FAFAFA]',
          '[&_.ant-table-thead_th]:!text-sm',
          '[&_.ant-table-thead_th]:!font-normal',
          '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
          '[&_.ant-table-thead_th]:uppercase',
          '[&_.ant-table-thead_th]:tracking-[0.05em]',
          '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
          '[&_.ant-table-thead > tr > th]:border-b-0',
          '[&_.ant-table-expand-icon-col]:w-0',
          '[&_.ant-table-expand-icon-col]:hidden'
        )}
        columns={columns}
        scroll={{ x: 'max-content' }}
        dataSource={CIRCUIT_PLACHOLDER_DATA[0] ? [CIRCUIT_PLACHOLDER_DATA[0]] : []}
        pagination={false}
      />
    </div>
  );
}
