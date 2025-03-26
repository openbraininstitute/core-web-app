import { SingleCircuitListView } from "../../type";
import HeaderButtonActionsBlock from "./HeaderButtonActionsBlock";

import HeaderNameAndRevision from "./HeaderNameAndRevision";

export default function HeaderCircuitDetailViewFirstRow({
    content
}:{
    content: SingleCircuitListView;
}) {

    return (
        <div className="relative  w-full flex flex-row justify-between items-end">
            <HeaderNameAndRevision content={content} />
            <HeaderButtonActionsBlock content={content} />
          </div>
    )
}