import Image, { StaticImageData } from "next/image";
import { useState } from "react";

export type SingleSectionCardProps = {
    title: string;
    description: string;
    image: StaticImageData;
}

export default function SingleSectionCard({
    content,
    index
}: {
    content: SingleSectionCardProps;
    index: number;
}) {

    const [mouseHover, setMouseHover] = useState<boolean>(false);

    return (
        <div
            className="relative h-[40vh] border border-solid border-neutral-3 p-5 overflow-hidden transition-colors duration-500 ease-linear bg-white hover:bg-neutral-1"
            onMouseOver={() => setMouseHover(true)}
            onFocus={() => setMouseHover(true)}
            onMouseOut={() => setMouseHover(false)}
            onBlur={() => setMouseHover(false)}
            >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex flex-col">
                <h3 className="text-xl">0{index + 1}</h3>
                <h2 className="text-[3.2vw] font-normal -translate-y-[1vh]">{content.title}</h2>
            </div>
            <div style={{opacity: mouseHover ? 1 : 0}} className="transition-opacity duration-500 ease-linear text-lg">
                {content.description}
            </div>
          </div>
          <Image
            src={content.image}
            alt={content.title}
            className="absolute z-0 left-0 transition-all ease-in-out duration-500"
            style={{
                transform: mouseHover ? 'scale(1.3) rotate(-12deg)' : 'scale(1) rotate(0deg)',
                filter: mouseHover ? 'grayscale(0%)' : 'grayscale(100%)',
                top: mouseHover ? '-20%' : '-12%',
            }}  
            width="900"
            height="600"
            />
        </div>
    )
}