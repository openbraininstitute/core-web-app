import { SingleCircuitListView } from "../../../type";

export default function RelatedArtifactsContent({
    content
}:{
    content: SingleCircuitListView
}) {

    return (
        <div className="relative w-full h-[60vh] flex flex-col items-center justify-center">
            <h2 className="relative text-6xl text-gray-400 uppercase font-normal">
                Coming Soon
            </h2>
        </div>
    )
}