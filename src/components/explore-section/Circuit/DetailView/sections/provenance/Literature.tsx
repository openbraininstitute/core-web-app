import { CircuitSchemaProps, PaperLitteratureProps } from "../../../type";
import PublicationCard from "../../literature/PublicationCard";
import SubtitleBar from "../SubtitleBar";

export default function Literature({
    content
}:{
    content: CircuitSchemaProps;
}) {

    const CIRCUIT_PROVENANCE_LITERATURE = content.literature.filter((publication: PaperLitteratureProps) => publication.category === 'circuit_source')
    const CIRCUIT_PROVENANCE_RELATED_ARTIFACTS = content.literature.filter((publication: PaperLitteratureProps) => publication.category === 'component_source')

    return (
        <div className="relative w-full flex flex-col">
            <SubtitleBar title="Circuit Provenance" />
            <div className="relative w-full flex flex-col gap-y-12">
                {
                    CIRCUIT_PROVENANCE_LITERATURE.map((publication: PaperLitteratureProps, index: number)=> (
                        <PublicationCard
                            key={`Publication_${publication.doi}-${index}`}
                            content={publication}
                            index={index}
                        />
                    ))
                }
            </div>
            <SubtitleBar title="Related artifacts provenance" />
            <div className="relative w-full flex flex-col gap-y-12">
                {
                    CIRCUIT_PROVENANCE_RELATED_ARTIFACTS.map((publication: PaperLitteratureProps, index: number)=> (
                        <PublicationCard
                            key={`Publication_${publication.doi}-${index}`}
                            content={publication}
                            index={index}
                        />
                    ))
                }
            </div>
        </div>
    )
}