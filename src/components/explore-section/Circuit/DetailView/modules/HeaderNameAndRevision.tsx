import { SingleCircuitListView } from "../../content/CIRCUITS_PLACEHOLDER";

import { ChevronRight } from "@/components/icons";

export default function HeaderNameAndRevision({
    content
}:{
    content: SingleCircuitListView;
}) {

    return (
        <div className="relative flex flex-row items-start">
            
            <div className="relative flex flex-col mr-8">
                <div className="font-light text-neutral-5 text-sm uppercase">
                    Name
                </div>
                <h1 className="font-bold text-primary-8 text-3xl">
                    {
                    content.name
                    }
                </h1>
            </div>

            <button
                type="button"
                aria-label="Toggle circuit revision"
                className="relative top-2.5 flex flex-row items-center justify-between w-36 h-10 px-4 border border-solid border-primary-8"
                >
                <span className="block text-primary-9 text-base">
                    Revision {content.metadata.revision}
                </span>

                <ChevronRight fill="#003A8C" className="w-auto h-3" />
            </button>

        </div>
    )
}