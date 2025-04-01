import { CircuitSchemaProps } from "../../type";
import ActionButton from "./ActionButton";

import { DownloadIcon, SimulateIcon } from "@/components/icons";
import CloneIcon from "@/components/icons/Clone";

export default function Heading({
    content
}:{
    content: CircuitSchemaProps
}) {

   return (
    <div className="relative w-full flex flex-row justify-between">
        <div className="relative flex flex-col">
            <div className="text-sm text-gray-500 uppercase tracking-wider">
                Name
            </div>
            <h1 className="text-3xl text-primary-9 font-bold">
                {content.name}
            </h1>
        </div>

        <div className="flex flex-row gap-x-6 text-primary-9">
            <ActionButton
                type="button"
                label="Simulate"
                action={() => { console.log('simulate') }}
                disabled
                link={content.files[0].url}>
                <SimulateIcon iconColor="#002766" className="w-4 h-4" />
            </ActionButton>
            <ActionButton
                type="button"
                label="Clone model"
                action={() => { console.log('Added to the library') }}
                disabled
                link={content.files[0].url}>
                <CloneIcon className="w-4 h-4" />
            </ActionButton>
            <ActionButton
                type="button"
                label="Save to Library"
                action={() => { console.log('Added to the library') }}
                disabled
                link={content.files[0].url}>
                <DownloadIcon iconColor="#002766" className="w-4 h-4" />
            </ActionButton>
            <ActionButton
                type="link"
                label="Download"
                link={content.files[0].url}>
                <DownloadIcon iconColor="#002766" className="w-4 h-4" />
            </ActionButton>
        </div>
    </div>
   )
}