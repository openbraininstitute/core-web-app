import { SingleCircuitListView } from "../../content/CIRCUITS_PLACEHOLDER";
import HeaderCircuitDetailViewSecondRow from "./HeaderCircuitDetailViewSecondRow";
import HeaderCircuitDetailViewFirstRow from "./HeaderFirstRow";

export default function HeaderCircuitDetailView({
    content
}:{
    content: SingleCircuitListView;
}) {

    return (
        <header className="relative w-full flex-col gap-4">
          
            <HeaderCircuitDetailViewFirstRow content={content} />
            <HeaderCircuitDetailViewSecondRow content={content} />
            
        </header>
    )
}