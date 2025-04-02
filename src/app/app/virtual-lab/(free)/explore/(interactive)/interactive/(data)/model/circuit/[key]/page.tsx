'use client'

import CIRCUITS_FULL from "@/components/explore-section/Circuit/content/circuits_tree_formatted";
import MainDetailViewCore from "@/components/explore-section/Circuit/DetailView/MainDetailViewCore";
import { CircuitSchemaProps } from "@/components/explore-section/Circuit/type";

export default function CircuitDetailPage({
    params
}:{
    params: {
        key: string;
    };
}) {

    const content: CircuitSchemaProps | undefined = CIRCUITS_FULL.find((circuit) => circuit.key === params.key) as CircuitSchemaProps | undefined;

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