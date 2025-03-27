import { PaperLitteratureProps, SingleCircuitListView } from '../../../type';
import SingleArticleCard from './SingleArticleCard';

export default function LiteratureContent({ content }: { content: SingleCircuitListView }) {
  const circuitProvenanceContent: PaperLitteratureProps[] = (
    content.provenance.literature || []
  ).filter((publication: PaperLitteratureProps) => publication.category === 'Circuit provenance');
  const relatedArtifactsProvenanceContent: PaperLitteratureProps[] = (
    content.provenance.literature || []
  ).filter(
    (publication: PaperLitteratureProps) => publication.category === 'Related artifacts provenance'
  );

  return (
    <div className="relative flex min-h-[60vh] w-full flex-col gap-y-20">
      <div className="relativee flex w-full flex-col">
        <div className="mb-12 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
          Circuit provenance
        </div>

        <div className="flex flex-col gap-y-8">
          {circuitProvenanceContent.length > 0 ? (
            circuitProvenanceContent.map((publication: PaperLitteratureProps) => (
              <SingleArticleCard key={`article_${publication.title}`} content={publication} />
            ))
          ) : (
            <div>No circuit provenance content available.</div>
          )}
        </div>
      </div>
      <div className="relativee flex w-full flex-col">
        <div className="mb-12 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
          Related artifacts provenance
        </div>
        <div className="flex flex-col gap-y-8">
          {circuitProvenanceContent.length > 0 ? (
            relatedArtifactsProvenanceContent.map((publication: PaperLitteratureProps) => (
              <SingleArticleCard key={`article_${publication.title}`} content={publication} />
            ))
          ) : (
            <div>No related artifacts provenance content available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
