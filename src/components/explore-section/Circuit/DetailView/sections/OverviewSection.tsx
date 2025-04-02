'use client'

import Image from "next/image";
import { CircuitSchemaProps } from "../../type";
import SubtitleBar from "./SubtitleBar";

export type ImageProps = {
    name: string;
    url: string;
}


export default function OverviewSection({
    content
}:{
    content: CircuitSchemaProps;
}) {

    return (
        <div className="relative w-full flex flex-col">
            <SubtitleBar title="Cell statistics " />
            <div className="relative flex flex-col gap-y-4">

                {
                    content.overview.cellStatistics.map((image: ImageProps) => (
                        <Image
                            key={image.name}
                            src={image.url}
                            alt={image.name}
                            width={1920}
                            height={1080}
                            className="w-full h-auto mb-4"
                        />
                    ))
                }
            </div>
            
            <SubtitleBar title="Network statistics " />
            <div className="relative flex flex-col gap-y-4">

                {
                    content.overview.networkStatistics.map((image: ImageProps) => (
                        <Image
                            key={image.name}
                            src={image.url}
                            alt={image.name}
                            width={1920}
                            height={1080}
                            className="w-full h-auto mb-4"
                        />
                    ))
                }
            </div>
           
        </div>
    )
}