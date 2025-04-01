import { CircuitSchemaProps } from "../../type";
import CircuitMetadata from "./CircuitMetadata";
import CircuitParameters from "./CircuitParameters";

export default function CircuitData({
    content
}:{
    content: CircuitSchemaProps
}) {

    return (
        <div className="relative w-full flex flex-row">
            <CircuitMetadata content={content} />
            <CircuitParameters content={content} />
        </div>
    )
}