import { CircuitSchemaProps } from "../../type";
import ParameterBox from "../global/ParameterBox";

export default function CircuitMetadata({
    content
}:{
    content: CircuitSchemaProps
}) {

    return (
        <div className="relative w-[480px] flex flex-col mr-24">
            <div>
                <ParameterBox
                    name="Description"
                    value={content.description}
                    />  
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
                <ParameterBox
                    name="Created by"
                    value={content.metadata.contributorSimple || "–"}
                    />

                <ParameterBox
                    name="Creation date"
                    value={content.metadata.creationDate}
                    />
            </div>
        </div>
    )
}