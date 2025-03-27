'use client'

import CalendarIcon from "@/components/icons/Calendar";
import Link from "next/link";
import { CopyIcon, LinkIcon } from "../../../icon/ArticlesIcons";
import { PaperLitteratureProps } from "../../../type";

export default function SingleArticleCard({
    content
}:{
    content: PaperLitteratureProps;
}) {

    const copyDOI = () => {
        navigator.clipboard.writeText(content.doi);
    }

    return (
        <div className="relative w-full flex flex-col text-primary-8">
            <header className="w-full flex flex-row">
                <div className="w-3/4 text-xl font-bold mb-2">
                    {
                        content.title
                    }
                </div>
                <div className="w-1/4 text-base font-light flex flex-row justify-end gap-x-8">
                    <Link href={content.link} target="_blank" className="flex flex-row items-center">
                        <LinkIcon iconColor="#003A8C" />
                        <span className="block ml-2">Link</span>
                    </Link>
                    <button
                        type="button"
                        aria-label="Copy the article's DOI"
                        onClick={copyDOI}
                        className="flex flex-row items-center"
                        >
                        <CopyIcon iconColor="#003A8C" />
                        <span className="block ml-2">Copy DOI</span>
                    </button>
                </div>
            </header>

            <div className="relative -top-2 w-full flex flex-row gap-x-4 text-base font-light">
                <div className="flex flex-row">
                    {
                        content.authors.map((author: string, index: number) => {
                            return (
                                <div key={index} className="mr-2">
                                    {author}
                                </div>
                            )
                        })
                    }
                </div>
                <div className="flex flex-row items-center gap-x-1">
                    <CalendarIcon className="relative top-px" />
                    <div>{content.publicationDate}</div>
                </div>
            </div>

            <p className="p-6 bg-gray-100 font-light text-base leading-normal mt-2">
                {content.abstract}
            </p>
        </div>
    )
}