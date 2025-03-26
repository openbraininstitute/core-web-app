import { classNames } from "@/util/utils";

import { ChevronRight } from "@/components/icons";
import { SingleCircuitListView } from "../type";

const columns = ({
        handleExpandRow,
        expandedRowKeys
    }:{
        handleExpandRow: (row: SingleCircuitListView, index: number) => void;
        expandedRowKeys: string[];
    }) => {

    return [
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
                <span className="whitespace-nowrap font-normal">{value.metadata.createdBy}</span>
            ),
        },
        {
            title: 'Creation date',
            key: 'creationDate',
            render: (value: SingleCircuitListView) => (
                <span className="whitespace-nowrap font-normal">{value.metadata.creationDate}</span>
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
}

export default columns;