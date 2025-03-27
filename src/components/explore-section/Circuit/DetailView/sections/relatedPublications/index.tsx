import { CircuitSchemaProps, PaperLitteratureProps } from '../../../type';
import SingleArticleCard from '../provenance/SingleArticleCard';

export default function RelatedPublicationsSection({ content }: { content: CircuitSchemaProps }) {
  const sourceContent: PaperLitteratureProps[] = content.relatedPublications.filter(
    (publication: PaperLitteratureProps) => publication.category === 'Source'
  );
  const applicationsContent: PaperLitteratureProps[] = content.relatedPublications.filter(
    (publication: PaperLitteratureProps) => publication.category === 'Applications'
  );

  return (
    <div className="relative flex min-h-[60vh] w-full flex-col gap-y-20">
      <div className="relativee flex w-full flex-col">
        <div className="mb-12 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
          Source
        </div>

        <div className="flex flex-col gap-y-8">
          {sourceContent.length > 0 ? (
            sourceContent.map((publication: PaperLitteratureProps) => (
              <SingleArticleCard key={`article_${publication.title}`} content={publication} />
            ))
          ) : (
            <div>No source publication available.</div>
          )}
        </div>
      </div>
      <div className="relativee flex w-full flex-col">
        <div className="mb-12 w-full bg-primary-8 px-4 py-3 text-xl font-normal text-white">
          Applications
        </div>
        <div className="flex flex-col gap-y-8">
          {applicationsContent.length > 0 ? (
            applicationsContent.map((publication: PaperLitteratureProps) => (
              <SingleArticleCard key={`article_${publication.title}`} content={publication} />
            ))
          ) : (
            <div>No application publication available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
