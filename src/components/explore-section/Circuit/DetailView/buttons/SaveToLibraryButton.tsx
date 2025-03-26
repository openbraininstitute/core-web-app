'use client'



import { AddIcon } from "@/components/icons";

export type FormatOptionsProps = {
    name: string;
    key: string;
}

export type FormatProps = {
    sonataFile: string;
    connectomeUtilitiesFile: string;
}

export default function SaveToLibraryButton() {


    return (
        <button
            type="button"
            aria-label="Open download format options"
            className="relative h-12 flex flex-row items-center"
            >
                <span className="block font-normal text-base text-primary-8 mr-3">
                    Save to library
                </span>

                <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
                    <AddIcon fill="#003a8c" className="w-4 h-auto" />
                </div>
        </button>
    )
}