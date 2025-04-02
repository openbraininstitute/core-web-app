import { CircuitSchemaProps } from "../../../type";
import SubtitleBar from "../SubtitleBar";
import PieCharts from "./graphs/PieCharts";
import VerticalBarChart from "./graphs/VerticalBarChats";

export type SingleGraphDataProps = {
    label: string;
    value: number;
}

export type GraphDataProps = {
    name: string;
    type: string;
    data: SingleGraphDataProps[]
}

export default function AllGraphs({
    content
}:{
    content: CircuitSchemaProps;
}) {

     const dataCellStatistics: GraphDataProps[] = [
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
                    { label: "Layer 1", value: 1.3 },
                    { label: "Layer 2", value: 13.2 },
                    { label: "Layer 3", value: 15.6 },
                    { label: "Layer 4", value: 16.2 },
                    { label: "Layer 5", value: 19.3 },
                    { label: "Layer 6", value: 34.5 },
                ]
            },
        ]
    
        const networkStatistics: GraphDataProps[] = [
            {
                name: "Connection probability overall",
                type: "verticalBarChart",
                data: [
                    { label: "Full 1", value: 1.92 },
                    { label: "Full 2", value: 1.92 },
                    { label: "Reciprocal 1", value: 1.92 },
                    { label: "Reciprocal 2", value: 0.4 },
                ]
            },
        ]

    return (
        <div className="relative w-full flex flex-col">
                    <SubtitleBar title="Cell statistics " />
                    <div className="relative grid grid-cols-3 w-full items-start pt-4">
                    {
                        dataCellStatistics.map((graph: GraphDataProps, index: number) => {
                            let graphChart;
        
                            switch(graph.type) {
                                case "pieChart":
                                    graphChart = <PieCharts data={graph.data} title={graph.name} index={index}  key={`graph_${graph.name}`} />
                                    break;
                                case "verticalBarChart":
                                    graphChart = <VerticalBarChart data={graph.data} title={graph.name} index={index}  key={`graph_${graph.name}`} />
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
                    <div className="relative grid grid-cols-3 w-full items-start pt-4">
                    {
                        networkStatistics.map((graph: GraphDataProps, index: number) => {
                            let graphChart;
        
                            switch(graph.type) {
                                case "pieChart":
                                    graphChart = <PieCharts data={graph.data} title={graph.name} index={index}  key={`graph_${graph.name}`} />
                                    break;
                                case "verticalBarChart":
                                    graphChart = <VerticalBarChart data={graph.data} title={graph.name} index={index}  key={`graph_${graph.name}`} />
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
                </div>
    )
}