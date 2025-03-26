import { SingleCircuitListView } from "../../type";
import HeaderArtifactData from "./HeaderArtifactData";
import HeaderMetadataHeader from "./HeaderMetadataHeader";

export default function HeaderCircuitDetailViewSecondRow({
    content
}:{
    content: SingleCircuitListView;
}) {

    return (
        <div className="relative w-full grid grid-cols-2 gap-16 mt-16">
            <HeaderMetadataHeader content={content} />
            <HeaderArtifactData content={content} />
        </div>
    )
}