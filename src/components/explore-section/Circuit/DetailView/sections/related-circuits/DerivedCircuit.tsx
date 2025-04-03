import { Table } from "antd";
import { TableRowSelection } from "antd/es/table/interface";
import { Key, useState } from "react";

import { CircuitSchemaProps } from "../../../type";
import columns from "./columns";

import { classNames } from "@/util/utils";
import styles from './ExploreCircuitTable.module.scss';

export default function DerivedCircuits({
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