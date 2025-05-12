import { DownloadItemProps, SingleSelectedDownloadableItemProps } from "../../type";

import { DownloadIcon } from "@/components/icons";

export function DownloadChildrenItem({
    item
}:{
    item: SingleSelectedDownloadableItemProps
}) {

    return (
        <div className="w-full flex flex-row justify-between text-primary-2">
            <div>
                <div className="text-lg font-bold">{item.name}</div>
                <div className="text-sm font-light">{item.description}</div>
            </div>
            <div className="flex flex-row font-light">
                <span>{item.size}</span>
                <span>{item.extension}</span>
                <button
                    type="button"
                    className="w-7 h-7 border border-solid border-primary-6 flex items-center justify-center"
                    onClick={() => {
                        // Handle download action
                    }}
                    aria-label={`Add download ${item.name} to the cart`}
                    >
                        <DownloadIcon iconColor="white" />
                </button>
            </div>
        </div>
    )
}

export default function DownloadItem({
        item
    }:{
        item: DownloadItemProps
    }) {

    return (
        <div className="w-full">
            <div className="w-full flex flex-row justify-between">
                <div className="font-bold text-lg text-white">{item.name}</div>
                <div className="flex flex-row font-light text-primary-3">
                    <span>{item.children ? item.children.length : 0}</span>
                </div>
            </div>
        </div>
    )
}