import { CircuitSchemaProps } from "../../../type";
import SubtitleBar from "../SubtitleBar";
import DerivedCircuits from "./DerivedCircuit";
import ParentCircuit from "./ParentCircuit";
import Subcircuits from "./Subcircuit";

export default function RelatedCircuitsSection({
    content
}:{
    content: CircuitSchemaProps;
}) {

    return (
        <div className="relative w-full flex flex-col">
            {
                !content.parent && (
                    <>
                        <SubtitleBar title="Parent circuit" />
                        <ParentCircuit content={content} />
                    </>
                )
            }
            {
                content.subcircuits && content.subcircuits.length > 0 && (
                    <>
                    <SubtitleBar title="Subcircuit" />
                    <Subcircuits content={content} />
                    </>
                )
            }
            <SubtitleBar title="Derived from" />
            <DerivedCircuits content={content} />
        </div>
    )
}