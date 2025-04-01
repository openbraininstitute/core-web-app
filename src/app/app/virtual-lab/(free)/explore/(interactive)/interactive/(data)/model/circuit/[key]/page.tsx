'use client'

import CIRCUITS from "@/components/explore-section/Circuit/content/circuits_tree";
import MainDetailViewCore from "@/components/explore-section/Circuit/DetailView/MainDetailViewCore";
import { CircuitSchemaProps } from "@/components/explore-section/Circuit/type";

export default function CircuitDetailPage({
    params
}:{
    params: {
        key: string;
    };
}) {

    const content: CircuitSchemaProps | undefined = CIRCUITS.find((circuit: CircuitSchemaProps) => circuit.key === params.key);

    if (!content) {
        return (
            <div className="relative w-full flex flex-col">
                <p>Circuit not found</p>
            </div>
        )
    }

    return (
        <div className="relative w-full flex flex-col">
            <MainDetailViewCore content={content} />
        </div>
    )
}   