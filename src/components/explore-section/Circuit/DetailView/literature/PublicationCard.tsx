'use client'

import Link from "next/link";
import { useState } from "react";
import { CopyIcon, LinkIcon } from "../../icon/ArticlesIcons";
import { PaperLitteratureProps } from "../../type";

import { UserIcon } from "@/components/icons";
import CalendarIcon from "@/components/icons/Calendar";
import { classNames } from "@/util/utils";


export default function PublicationCard({
    content,
    index
}:{
    content: PaperLitteratureProps;
    index: number;
}) {

    const {abstract} = content

    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    const copyDOI = () => {
        navigator.clipboard.writeText(content.doi);
        alert('DOI copied to clipboard');
    }

    return (
        <div className="relative w-full flex flex-col">
            <header className="relative w-full flex flex-row items-start justify-between mb-2">
                <div className="relative flex flex-row gap-x-2">
                    <div className="relative top-px w-6 h-6 bg-primary-8 text-white text-base flex items-center justify-center">
                        { index + 1 }
                    </div>
                    <h3 className="relative max-w-[75%] flex flex-row text-xl font-semibold">
                        { content.title }
                    </h3>
                </div>
                <div className="flex flex-row gap-x-3">
                    <Link href={content.url} target="_blank" className="flex flex-row items-center text-base font-normal text-[#003A8C]">
                        <LinkIcon iconColor="#003A8C" className="w-4 h-4 mr-2" />
                        <span>Link</span>
                    </Link>
                    <button type="button" onClick={copyDOI} className="flex flex-row items-center text-base font-normal text-[#003A8C]">
                        <CopyIcon iconColor="#003A8C" className="w-4 h-4 mr-2" />
                        <span className="whitespace-nowrap">Copy DOI</span>
                    </button>
                </div>
            </header>

            <div className="relative w-full flex flex-row justify-between mb-3">
                <div className="relative w-2/3 flex flex-row mr-6">
        
                    <div className="w-7 h-7 rounded-full border border-solid border-gray-300 flex items-center justify-center mr-3">
                        <UserIcon iconColor="#003A8C" className="relative left-px w-3 h-3" />
                    </div>

                    <div className="relative text-base font-normal text-[#003A8C] hyphens-auto">
                        { content.authors }
                    </div>         

                </div>
                <div className="relative flex flex-row text-primary-9">

                    <div className="w-7 h-7 rounded-full border border-solid border-gray-300 flex items-center justify-center mr-2">
                        <CalendarIcon className="relative w-3.5 h-3.5" />
                    </div>
                    <div className="text-base font-normal text-[#003A8C]">
                        { content.publicationDate }
                    </div>

                </div>
            </div>

            <div className="relative flex flex-col items-start">
                <div className={classNames( "w-full p-6 bg-gray-100",
                     isExpanded ? "max-h-full" : "max-h-[10em]"
                )}>
                    <p
                        className={`w-full overflow-hidden  text-base leading-normal text-primary-8 transition-all duration-300 ${
                            isExpanded ? "max-h-full" : "max-h-[6.3em] line-clamp-3"
                        }`}
                        >
                        { abstract }
                    </p>
                    <button
                        type="button"
                        aria-label={isExpanded ? "Read less" : "Read more"}
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-2 text-gray-500 underline underline-offset-[6px] hover:underline focus:outline-none"
                        >
                        {isExpanded ? "Read Less" : "Read More"}
                    </button>
                </div>
            </div>
        </div>
    )
}