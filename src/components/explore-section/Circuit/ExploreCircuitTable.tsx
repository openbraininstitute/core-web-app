'use client'

import { useState } from "react";

import { Table } from "antd";
import { CircuitColumn } from "./type";

import CIRCUIT_PLACHOLDER_DATA, { SingleCircuitListView } from "./content/CIRCUITS_PLACEHOLDER";
import { ArrowSmall } from "./icon/ArrowSubcircuitIcon";

import { classNames } from "@/util/utils";



import { ChevronRight } from "@/components/icons";


export default function ExploreCircuitTable() {

    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

    const handleExpandRow = (row: SingleCircuitListView, index: number) => {
        console.log('The index is:', index);
        const rowKey = row.key;
        setExpandedRowKeys((prev) =>
          prev.includes(rowKey)
            ? prev.filter((key) => key !== rowKey)
            : [...prev, rowKey]
        );
      };
    
    const expandedRowRender = (circuit: SingleCircuitListView): JSX.Element => {
        return (
            <>
            <div className="relative flex flex-row">
                <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
                <span className="ml-3 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">Subcircuits</span>
            </div>
            <Table<SingleCircuitListView>
                columns={columns}
                dataSource={circuit.subcircuits || []}
                pagination={false}
                bordered
            />
            </>
        );
    };

    const columns: CircuitColumn[] = [
        {
            title: 'Name',
            key: 'name',
            render: (value: SingleCircuitListView) => (
                <span className="whitespace-nowrap">{value.name}</span>
            ),
        },
        {
            title: 'Description',
            key: 'description',
            render: (value: SingleCircuitListView) => (
                <span className="whitespace-nowrap font-normal">{value.description}</span>
            ),
        },
        {
            title: 'Brain region',
            key: 'brainRegion',
            render: (value: SingleCircuitListView) => (
                <span className="whitespace-nowrap font-normal">{value.brainRegion}</span>
            ),
        },
        {
            title: '# Neurons',
            key: 'numberOfNeurons',
            render: (value: SingleCircuitListView) => (
                <span className="whitespace-nowrap font-normal">{value.numberOfNeurons}</span>
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
                <span className="whitespace-nowrap font-normal">{value.createdBy}</span>
            ),
        },
        {
            title: 'Creation date',
            key: 'creationDate',
            render: (value: SingleCircuitListView) => (
                <span className="whitespace-nowrap font-normal">{value.creationDate}</span>
            ),
        },
        {
            title: 'Subcircuits',
            key: 'hasSubcircuits',
            render: (value: SingleCircuitListView, index?: number) => {
                const isExpanded = expandedRowKeys.includes(value.key);

                return value.hasSubcircuits && (
                    <button
                        type="button"
                        className="relative h-6 flex items-center justify-center text-base font-normal"
                        aria-label="Open subcircuit"
                        onClick={() => handleExpandRow(value, index ?? -1)}
                        disabled={!value.hasSubcircuits}
                        >
                        <div className="relative block mr-6 ">
                            {value.subcircuits?.length}
                        </div>
                        <ChevronRight
                            fill="#003A8C"
                            className={classNames(
                                "relative top-px w-auto h-4 transition-transform duration-300 ease-in-out",
                                isExpanded ? "rotate-90" : "rotate-0"
                            )}
                            />
                    </button>
                )
            }
                
        }
      ]


    return (
        <div className="relative w-full h-full bg-white text-primary-9 text-2xl font-bold p-10">
            <Table
                className={classNames(
                    '[&_.ant-table-thead_th]:text-[14px]',
                    '[&_.ant-table-thead_th]:font-normal',
                    '[&_.ant-table-thead_th]:text-[#8C8C8C]',
                    '[&_.ant-table-thead_th]:uppercase',
                    '[&_.ant-table-thead_th]:tracking-[0.05em]', 
                    '[&_.ant-table-tbody>tr:last-child>td]:border-b-0',
                    '[&_.ant-table-thead>tr>th]:border-b-0'
                )}
                dataSource={CIRCUIT_PLACHOLDER_DATA}
                columns={columns}
                pagination={false}
                scroll={{ x: "max-content" }}
                expandable={{
                    expandedRowRender,
                    expandedRowKeys,
                    onExpand: (expanded: boolean, row: SingleCircuitListView) => {
                        const rowKey = row.key;
                        setExpandedRowKeys((prev) => 
                            expanded ? [...prev, rowKey] : prev.filter((key: string) => key !== rowKey)
                        )
                    },
                    expandIcon: () => null,
                }}
            />
        </div>
    )
}