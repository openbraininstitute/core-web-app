'use client'

import Link from "next/link";
import { useState } from "react";

import { SingleFileProps } from "../../content/CIRCUITS_PLACEHOLDER";

import { DownloadIcon } from "@/components/icons";

export type FormatOptionsProps = {
    name: string;
    key: string;
}

export type FormatProps = {
    sonataFile: string;
    connectomeUtilitiesFile: string;
}

export default function DownloadCircuitButton({
    formats
}:{
    formats: SingleFileProps[];
}) {

    const [displayFormatOptions, setDisplayFormatOptions] = useState<boolean>(false);

    return (
        <div className="relative w-44 flex flex-col transition-height duration-300 ease-in-out overflow-hidden" style={{}}>
            <button
                type="button"
                aria-label="Open download format options"
                className="relative h-12 flex flex-row items-center"
                onClick={() => setDisplayFormatOptions(!displayFormatOptions)}
                >
                    <span className="block font-normal text-base text-primary-8 mr-3">
                        Download
                    </span>

                    <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
                        <DownloadIcon iconColor="#003a8c" className="w-4 h-auto" />
                    </div>
            </button>

            <div className="absolute top-0 left-0 flex flex-col">
                {
                    formats.map((format: SingleFileProps) => (
                        <Link key={format.key} href={format.url}>
                            {format.type}
                        </Link>
                    ))
                }
            </div>
        </div> 
    )
}