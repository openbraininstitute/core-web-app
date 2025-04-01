'use client'

import { CircuitSchemaProps } from "../../type";
import PieCharts from "./overview/graphs/PieCharts";
import SubtitleBar from "./SubtitleBar";

export type SingleGraphDataProps = {
    label: string;
    value: number;
}

export type GraphDataProps = {
    name: string;
    type: string;
    data: SingleGraphDataProps[]
}


export default function OverviewSection({
    content
}:{
    content: CircuitSchemaProps;
}) {

    const allData: GraphDataProps[] = [
        {
            name: "El cell distribution",
            type: "pieChart",
            data: [
                { label: "Inhibitory", value: 11.8 },
                { label: "Excitatory", value: 88.2 },
            ]
        },
        {
            name: "Layer cell distribution",
            type: "pieChart",
            data: [
                { label: "1", value: 1.3 },
                { label: "2", value: 13.2 },
                { label: "3", value: 15.6 },
                { label: "4", value: 16.2 },
                { label: "5", value: 19.3 },
                { label: "6", value: 34.5 },
            ]
        },
    ]


    return (
        <div className="relative w-full flex flex-col">
            <SubtitleBar title="Cell statistics " />
            <div className="relative grid grid-cols-3 w-full items-start pt-4">
            {
                allData.map((graph: GraphDataProps, index: number) => {
                    let graphChart;

                    switch(graph.type) {
                        case "pieChart":
                            graphChart = <PieCharts data={graph.data} title={graph.name} index={index}  key={`graph_${graph.name}`} />
                            break;
                        default:
                            graphChart = "Hello world"
                            break;
                    }
                    return (
                        <div key={`graph_${graph.name}`} className="relative w-full flex flex-col items-center justify-center py-4" >
                            { graphChart }
                        </div>
                    )
                })
            }
            </div>
            <SubtitleBar title="Network statistics " />
        </div>
    )
}