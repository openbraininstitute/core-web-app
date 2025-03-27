import { SingleCircuitListView } from "../../../type";

export default function RelatedPublicationsSection({
    content
}:{
    content: SingleCircuitListView;
}) {

    return (
        <div className="relative w-full flex flex-col">
            Related Circuit ${content.name}  
        </div>
    )
}