'use client'

import { useState } from "react";

import { SingleCircuitListView } from "../../type";
import CircuitSectionTabs from "./Tabs";
import OverviewSection from "./overview";
import ProvenanceSection from "./provenance";
import RelatedCircuitsSection from "./relatedCircuits";
import RelatedPublicationsSection from "./relatedPublications";

export default function CircuitDetailViewSectionContainer({
    content
}:{
    content: SingleCircuitListView;
}) {

    const [activeSection, setActiveSection] = useState<"overview" | "provenance" | "related publication" | "Related circuits">("overview");
    
    let section;

    switch (activeSection) {
        case "overview":
            section = <OverviewSection content={content} />;
            break;
        case "provenance":
            section = <ProvenanceSection content={content} />;
            break;
        case "related publication":
            section = <RelatedPublicationsSection content={content} />;
            break;
        case "Related circuits":
            section = <RelatedCircuitsSection content={content} />;
            break;
        default:
            section = <OverviewSection content={content} />;
            break;
    }

    return (
        <div className="relative w-full flex flex-col">
            <CircuitSectionTabs
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                />
            {
                section
            }    
        </div>
    )
}