import { Table } from "antd";
import { TableRowSelection } from "antd/es/table/interface";
import { Key, useState } from "react";

import CIRCUITS_FULL from "../../../content/circuits_tree_formatted";
import { CircuitSchemaProps } from "../../../type";

import CircuitDownloadButton from "./CircuitDownloadButton";
import columns from "./columns";

import { classNames } from "@/util/utils";
import styles from './ExploreCircuitTable.module.scss';

export function findParentCircuitByName(parentName: string): CircuitSchemaProps | null {
  function search(circuits: CircuitSchemaProps[]): CircuitSchemaProps | null {
    
    for (const circuit of circuits) {
      
      if (circuit.name === parentName) {
        return circuit;
      }

      if (circuit.hasSubcircuits && circuit.subcircuit && circuit.subcircuit.length > 0) {
        const found = search(circuit.subcircuit);
        if (found) return found;
      }
    }
    return null; 
  }

  return search(CIRCUITS_FULL);
}

export default function ParentCircuit({
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
            dataSource={findParentCircuitByName(content.name) ? [findParentCircuitByName(content.name)].filter(Boolean) as CircuitSchemaProps[] : []}
            pagination={false}
            rowSelection={rowSelection}
        />

        {content.files[0] && (
          <CircuitDownloadButton
            link={content.files[0].url} 
            selectedRowKeys={selectedRowKeys}
            />   
            )
        }
        </div>
    ))
}