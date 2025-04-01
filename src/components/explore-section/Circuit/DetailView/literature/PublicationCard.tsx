import { UserIcon } from "@/components/icons";
import CalendarIcon from "@/components/icons/Calendar";
import { PublicationCardProps } from "@/types/circuit/publication";
import Link from "next/link";
import { CopyIcon, LinkIcon } from "../../icon/ArticlesIcons";


export default function PublicationCard({
    content
}:{
    content: PublicationCardProps;
}) {

    const copyDOI = () => {
        navigator.clipboard.writeText(content.doi.url);
        alert('DOI copied to clipboard');
    }

    return (
        <div className="relative w-full flex flex-col">
            <header className="relative w-full flex flex-row items-start justify-between mb-2">
                <h3 className="relative max-w-[75%] flex flex-row text-xl font-semibold">
                    { content.title }
                </h3>
                <div className="flex flex-row gap-x-3">
                    <Link href={content.link} target="_blank" className="flex flex-row items-center text-base font-normal text-[#003A8C]">
                        <LinkIcon iconColor="#003A8C" className="w-4 h-4 mr-2" />
                        <span>Link</span>
                    </Link>
                    <button type="button" onClick={copyDOI} className="flex flex-row items-center text-base font-normal text-[#003A8C]">
                        <CopyIcon iconColor="#003A8C" className="w-4 h-4 mr-2" />
                        <span>Copy DOI</span>
                    </button>
                </div>
            </header>

            <div className="relative w-full flex flex-row mb-3">
                <div className="flex flex-row mr-6">
                    <div className="w-7 h-7 rounded-full border border-solid border-gray-300 flex items-center justify-center mr-3">
                        <UserIcon iconColor="#003A8C" className="relative left-px w-3 h-3" />
                    </div>
                    <div className="relative flex flex-row">
                    {
                        content.authors.map((author, index) => (
                            <span key={index} className="text-base font-normal text-[#003A8C]">
                                { author }{ index < content.authors.length - 1 ? ', ' : '' }
                            </span>
                        ))
                    }
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

            <p className="w-full flex flex-col bg-gray-100 text-base leading-normal text-primary-8 p-10">
                { content.abstract }
            </p>
        </div>
    )
}