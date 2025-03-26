import { SingleCircuitListView } from "../../content/CIRCUITS_PLACEHOLDER";
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
        <div className="relative flex flex-row gap-x-5">
            <SimulateCircuitModelButton />
            <CloneCircuitModelButton />
            <SaveToLibraryButton />
            <DownloadCircuitButton formats={content.files} />
        </div>
    )
}