'use client'

import { CircuitSchemaProps } from "../../type";
import SubtitleBar from "./SubtitleBar";

export default function OverviewSection({
    content
}:{
    content: CircuitSchemaProps;
}) {


    return (
        <div className="relative w-full flex flex-col">
            <SubtitleBar title="Cell statistics " />
            <SubtitleBar title="Network statistics " />
        </div>
    )
}