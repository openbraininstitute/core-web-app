import { Table } from 'antd';

import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';

import { SingleCircuitListView } from '../content/CIRCUITS_PLACEHOLDER';

import { classNames } from '@/util/utils';

export default function ExploreSubcircuitLevel1({
  columns,
  circuit,
  rowSelection,
}: {
  columns: any;
  circuit: SingleCircuitListView;
  rowSelection: any;
}) {
  return (
    <div className="relative flex flex-col pl-[17px]">
      <div className="relative flex flex-row pl-[48px]">
        <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
        <span className="ml-3 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">
          Subcircuits
        </span>
      </div>
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
        dataSource={circuit.subcircuits || []}
        pagination={false}
        rowSelection={rowSelection}
      />
    </div>
  );
}
