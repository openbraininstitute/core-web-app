import { useState } from "react";
import { CircuitSchemaProps } from "../../type";
import SectionContentBlock from "./SectionContentBlock";
import SectionTabs from "./SectionTabs";

export default function SectionMainContainer({
    content
}:{
    content: CircuitSchemaProps
}) {

    const [activeSection, setActiveSection] = useState<'overview' | 'provenance' | 'related-publications' | 'related-circuits'>('overview');

    return (
        <div className="relative w-full flex flex-col">
            <SectionTabs activeSection={activeSection} setActiveSection={setActiveSection} />
            <SectionContentBlock content={content} activeSection={activeSection} />
        </div>
    )
}