import { PaperLitteratureProps, SingleCircuitListView } from "../../../type";
import SingleArticleCard from "./SingleArticleCard";

export default function LiteratureContent({
    content
}:{
    content: SingleCircuitListView
}) {

    const circuitProvenanceContent: PaperLitteratureProps[] = (content.provenance.literature || []).filter((publication: PaperLitteratureProps) => publication.category === "Circuit provenance");
    const relatedArtifactsProvenanceContent: PaperLitteratureProps[] = (content.provenance.literature || []).filter((publication: PaperLitteratureProps) => publication.category === "Related artifacts provenance");

    return (
        <div className="relative w-full min-h-[60vh] flex flex-col gap-y-20">
            <div className="relativee w-full flex flex-col">
                <div className="w-full bg-primary-8 text-white font-normal text-xl px-4 py-3 mb-12">
                    Circuit provenance
                </div>

                <div className="flex flex-col gap-y-8">
                {
                    circuitProvenanceContent.length > 0 ? (
                        circuitProvenanceContent.map((publication: PaperLitteratureProps) => (
                            <SingleArticleCard key={`article_${publication.title}`} content={publication} />
                        ))
                    ) : (
                        <div>No circuit provenance content available.</div>
                    )
                }
                </div>
            </div>
            <div className="relativee w-full flex flex-col">
                <div className="w-full bg-primary-8 text-white font-normal text-xl px-4 py-3 mb-12">
                    Related artifacts provenance
                </div>
                <div className="flex flex-col gap-y-8">
                {
                    circuitProvenanceContent.length > 0 ? (
                        relatedArtifactsProvenanceContent.map((publication: PaperLitteratureProps) => (
                            <SingleArticleCard key={`article_${publication.title}`} content={publication} />
                        ))
                    ) : (
                        <div>No related artifacts provenance content available.</div>
                    )
                }
                </div>
            </div>
        </div>
    )
}