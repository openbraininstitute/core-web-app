import truncate from "@/util/truncate";
import { classNames } from "@/util/utils";
import { Table } from "antd";
import { TableRowSelection } from "antd/es/table/interface";
import { Key, useState } from "react";
import { CircuitColumn, CircuitSchemaProps } from "../../../type";

import styles from './ExploreCircuitTable.module.scss';

export default function Subcircuits({
    content
}:{
    content: CircuitSchemaProps;
}){
    const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
    
      const rowSelection: TableRowSelection<CircuitSchemaProps> = {
        type: 'radio',
        selectedRowKeys,
        onChange: (newSelectedRows: Key[]) => {
          setSelectedRowKeys(newSelectedRows);
        },
      };

    const columns: CircuitColumn[] = [
        {
          title: 'Name',
          key: 'name',
          render: (value: CircuitSchemaProps) => (
            <span className="whitespace-nowrap">{value.name}</span>
          ),
        },
        {
          title: 'Description',
          key: 'description',
          render: (value: CircuitSchemaProps) => (
            <span className="whitespace-nowrap font-normal">{truncate(value.description, 40)}</span>
          ),
          width: 300,
        },
        {
          title: 'Brain region',
          key: 'brainRegion',
          render: (value: CircuitSchemaProps) => (
            <span className="whitespace-nowrap font-normal">{value.brainRegion}</span>
          ),
        },
        {
          title: '# Neurons',
          key: 'numberOfNeurons',
          render: (value: CircuitSchemaProps) => (
            <span className="whitespace-nowrap font-normal">{value.numberOfNeurons}</span>
          ),
        },
        {
          title: 'Species',
          key: 'specie',
          render: (value: CircuitSchemaProps) => (
            <span className="whitespace-nowrap font-normal">{value.species}</span>
          ),
        },
        {
          title: 'Contributor',
          key: 'contributorSimple',
          render: (value: CircuitSchemaProps) => (
            <span className="whitespace-nowrap font-normal">{value.metadata.contributorSimple}</span>
          ),
        },
        {
          title: 'Registration date',
          key: 'registrationDate',
          render: (value: CircuitSchemaProps) => (
            <span className="whitespace-nowrap font-normal">{value.metadata.registrationDate}</span>
          ),
        },
      ];

    return ((
        <div className="relative w-full flex flex-col">
            <Table<CircuitSchemaProps>
          className={classNames(
            '[&_.ant-table-tbody]:bg-[#FAFAFA]',
            '[&_.ant-table-row]:bg-[#FAFAFA]',
            '[&_.ant-table-thead_th]:!text-sm',
            '[&_.ant-table-thead_th]:!font-normal',
            '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
            '[&_.ant-table-thead_th]:uppercase',
            '[&_.ant-table-thead_th]:tracking-[0.05em]',
            '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
            '[&_.ant-table-thead > tr > th]:border-b-0',
            '[&_.ant-table-expand-icon-col]:w-0',
            '[&_.ant-table-expand-icon-col]:hidden',
            styles.circuitTable
          )}
          columns={columns}
          dataSource={content.subcircuit || []}
          pagination={false}
          rowSelection={rowSelection}
        />
        </div>
    ))
}