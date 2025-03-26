import { SingleCircuitListView } from "../../type";
import CloneCircuitModelButton from "../buttons/CloneCircuitModelButton";
import DownloadCircuitButton from "../buttons/DownloadCircuitButton";
import SaveToLibraryButton from "../buttons/SaveToLibraryButton";
import SimulateCircuitModelButton from "../buttons/SimulateCircuitModelButton";

export default function HeaderButtonActionsBlock({
    content
}:{
    content: SingleCircuitListView
}) {

    return (
        <div className="relative flex flex-row gap-x-5 -right-12">
            <SimulateCircuitModelButton />
            <CloneCircuitModelButton />
            <SaveToLibraryButton />
            <DownloadCircuitButton formats={content.files} />
        </div>
    )
}