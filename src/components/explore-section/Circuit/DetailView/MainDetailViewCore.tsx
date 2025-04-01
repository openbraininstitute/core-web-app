import { CircuitSchemaProps } from "../type";
import HeaderDetailView from "./HeaderDetailView";
import SectionMainContainer from "./sections/SectionMainContainer";
import Visualiser from "./visualisation/Visualiser";

export default function MainDetailViewCore({
    content
}:{
    content: CircuitSchemaProps;
}) {


    return (

        <div className="relative w-full flex flex-col text-primary-9">
            <HeaderDetailView content={content} />
            <Visualiser alt={`Image of the circuit ${content.name}`} />
            <SectionMainContainer content={content} /> 
        </div>
    )
}