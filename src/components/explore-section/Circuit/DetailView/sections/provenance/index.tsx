import { useState } from "react";
import { CircuitSchemaProps } from "../../../type";
import SubtitleBar from "../SubtitleBar";

export type ProvenanceSubsectionProps = {
    name: string;
    id: 'literature' | 'related artifacts';
}

export default function ProvenanceSection({
    content
}:{
    content: CircuitSchemaProps;
}) {

    const subsections: ProvenanceSubsectionProps[] = [
        { name: 'Literature', id: 'literature' },
        { name: 'Related artifacts', id: 'related artifacts' }
    ]

    const [currentSubsectiion, setCurrentSubsection] = useState<'literature' | 'related artifacts'>('literature');

    return (
        <div className="relative w-full flex flex-col">
            <div className="relative grid grid-cols-2 w-full">
                {
                    subsections.map((subsection: ProvenanceSubsectionProps) => (
                        <button
                            type="button"
                            key={subsection.id}
                            className="relative w-full flex items-center justify-center py-4 text-lg"
                            onClick={() => setCurrentSubsection(subsection.id)}
                            aria-label="Provenance subsection"
                            aria-current={currentSubsectiion === subsection.id ? 'true' : 'false'}
                            style={{
                                backgroundColor: currentSubsectiion === subsection.id ? '#F6F8FA' : 'white',
                                borderBottom: currentSubsectiion === subsection.id ? '2px solid #3B82F6' : 'none'   
                            }}>
                                { subsection.name }
                            </button>
                    ))
                }
            </div>
            <SubtitleBar title="Cell statistics" />
            <SubtitleBar title="Network statistics" />
        </div>
    )
}