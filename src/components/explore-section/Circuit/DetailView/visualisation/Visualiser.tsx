'use client'

import Image from "next/image";
import { CircuitSchemaProps } from "../../type";
import placeholderImage from "./circuit-preview-image_01.jpg";

export default function Visualiser({
    content
}:{
    content: CircuitSchemaProps;
}) {

    const imageUrl = content.overview.mainDisplay[0].url

    return (
        <div
            id="visualiser"
            className="relative w-full flex items-center justify-center my-24 bg-white overflow-hidden"
            >
            <Image
                src={imageUrl || placeholderImage}
                width={1920}
                height={1080}
                alt={`Image of the circuit ${content.name}`}
                className="relative z-10 select-none transition-all duration-300 ease-out"
                priority
            />

        </div>
    )
}