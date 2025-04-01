import { CircuitSchemaProps } from "../../type";
import OverviewSection from "./OverviewSection";
import ProvenanceSection from "./provenance";
import RelatedCircuitsSection from "./related-circuits";
import RelatedPublicationssSection from "./related-publications";

export default function SectionContentBlock({
    content,
    activeSection
}:{
    content: CircuitSchemaProps;
    activeSection: 'overview' | 'provenance' | 'related-publications' | 'related-circuits';
}) {

    let currentSection;

    switch (activeSection) {
        case 'overview':
            currentSection = <OverviewSection content={content} />;
            break;
        case 'provenance':
            currentSection = <ProvenanceSection content={content} />;
            break;
        case 'related-circuits':
            currentSection = <RelatedPublicationssSection content={content} />;
            break;
        case 'related-publications':
            currentSection = <RelatedCircuitsSection content={content} />;
            break;
        default:
            currentSection = null;
    }

    return (
        <div className="relative w-full flex flex-col p-12 bg-white">
           {
            currentSection
           }
        </div>
    )
}