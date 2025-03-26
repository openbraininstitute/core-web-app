'use client'

import { Key, useState } from "react";

import { Table } from "antd";

import CIRCUIT_PLACHOLDER_DATA, { SingleCircuitListView } from "./content/CIRCUITS_PLACEHOLDER";
import { ArrowSmall } from "./icon/ArrowSubcircuitIcon";

import { CircuitColumn } from "./type";

import { ChevronRight } from "@/components/icons";
import { classNames } from "@/util/utils";


export default function ExploreCircuitTable() {

    const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

    const handleExpandRow = (row: SingleCircuitListView, index: number) => {
        if (!row.hasSubcircuits) return;
        console.log('The index is:', index);
        const rowKey = row.key;
        setExpandedRowKeys((prev) =>
          prev.includes(rowKey)
            ? prev.filter((key) => key !== rowKey)
            : [...prev, rowKey]
        );
      };

    // const rowSelection = {
    //     selectedRowKeys,
    //     onChange: (newSelectedRow: Key[], _selectedRow: SingleCircuitListView[]) => {
    //         setSelectedRowKeys(newSelectedRow as string[]);
    //         console.log('Selected rows:', newSelectedRow);
    //     },
    // }

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: Key[], selectedRows: SingleCircuitListView[]) => {
          // When a parent row is selected, expand it and select its sub-rows
          const updatedExpandedKeys = newSelectedRowKeys
            .filter((key) => CIRCUIT_PLACHOLDER_DATA.some((row) => row.key === key && row.hasSubcircuits))
            .map((key) => key as string);
          const subRowKeys = selectedRows
            .flatMap((row) => row.subcircuits?.map((sub) => sub.key) || [])
            .filter(Boolean);
          setExpandedRowKeys(updatedExpandedKeys);
          setSelectedRowKeys([...newSelectedRowKeys.map((k) => k as string), ...subRowKeys]);
        },
        getCheckboxProps: (record: SingleCircuitListView) => ({
          disabled: !record.hasSubcircuits,
        }),
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

    // SUBCIRCUIT TABLE - LEVEL 1
    const expandedRowRender = (circuit: SingleCircuitListView): JSX.Element => {
        return (
            <div className="relative flex flex-col pl-[17px]">
                <div className="relative flex flex-row pl-[48px]">
                    <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
                    <span className="ml-3 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">Subcircuits</span>
                </div>
                <Table<SingleCircuitListView>
                    className={classNames(
                        "[&_.ant-table-row]:bg-[#FAFAFA]",
                        '[&_.ant-table-thead_th]:!text-sm',
                        '[&_.ant-table-thead_th]:!font-normal',
                        '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
                        '[&_.ant-table-thead_th]:uppercase',
                        '[&_.ant-table-thead_th]:tracking-[0.05em]', 
                        '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
                        '[&_.ant-table-thead > tr > th]:border-b-0',
                        "[&_.ant-table-expand-icon-col]:w-0",
                        "[&_.ant-table-expand-icon-col]:hidden" 
                    )}
                    columns={columns}
                    dataSource={circuit.subcircuits || []}
                    pagination={false}
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (newSelectedRow: Key[], _selectedRow: SingleCircuitListView[]) => {
                            const parentKey = circuit.key;
                            const updatedKeys = selectedRowKeys
                                .filter((key) => !circuit.subcircuits?.find((subcircuit) => subcircuit.key === key))
                                .concat(newSelectedRow as string[])
                            if (!updatedKeys.includes(parentKey)) updatedKeys.push(parentKey);
                            setSelectedRowKeys(updatedKeys);
                            // setSelectedRowKeys(newSelectedRow as string[]);
                            // console.log('Selected rows:', newSelectedRow);
                        },
                    }}
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
        );
    };


    return (
        <div className="relative w-full h-full bg-white text-primary-9 text-2xl font-bold py-10">
            <Table
                className={classNames(
                    '[&_.ant-table-thead_th]:!text-sm',
                    '[&_.ant-table-thead_th]:!font-normal',
                    '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
                    '[&_.ant-table-thead_th]:uppercase',
                    '[&_.ant-table-thead_th]:tracking-[0.05em]', 
                    '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
                    '[&_.ant-table-thead > tr > th]:border-b-0',
                    "[&_.ant-table-expand-icon-col]:w-0",
                    "[&_.ant-table-expand-icon-col]:hidden" 
                )}
                style={{ "--ant-table-expand-icon-col-width": "0px" } as React.CSSProperties}
                dataSource={CIRCUIT_PLACHOLDER_DATA}
                columns={columns}
                pagination={false}
                scroll={{ x: "max-content" }}
                rowSelection={rowSelection}
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