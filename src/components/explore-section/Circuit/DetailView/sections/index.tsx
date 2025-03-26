'use client'

import { useState } from "react";

import { SingleCircuitListView } from "../../type";
import CircuitSectionTabs from "./Tabs";

export default function CircuitDetailViewSectionContainer({
    content
}:{
    content: SingleCircuitListView;
}) {

    const [activeSection, setActiveSection] = useState<"overview" | "provenance" | "related publication" | "Related circuits">("overview");
    
    return (
        <div className="relative w-full flex flex-col">
            <CircuitSectionTabs
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                />
        </div>
    )
}