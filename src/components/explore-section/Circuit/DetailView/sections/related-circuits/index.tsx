import { CircuitSchemaProps } from "../../../type";
import SubtitleBar from "../SubtitleBar";

export default function RelatedCircuitsSection({
    content
}:{
    content: CircuitSchemaProps;
}) {

    return (
        <div className="relative w-full flex flex-col">
            <SubtitleBar title="Source" />
            <SubtitleBar title="Applications" />
        </div>
    )
}