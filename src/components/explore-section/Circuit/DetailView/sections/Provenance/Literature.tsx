import { useMemo } from 'react';
import { CircuitSchemaProps, PaperLiteratureProps } from '../../../type';
import PublicationCard from '../global/PublicationCard';
import SubtitleBar from '../global/SubtitleBar';

export default function Literature({ content }: { content: CircuitSchemaProps }) {
  const CIRCUIT_PROVENANCE_LITERATURE = useMemo(
    () =>
      content.literature.filter(
        (publication: PaperLiteratureProps) => publication.category === 'circuit_source'
      ),
    [content.literature]
  );

  const CIRCUIT_PROVENANCE_RELATED_ARTIFACTS = useMemo(
    () =>
      content.literature.filter(
        (publication: PaperLiteratureProps) => publication.category === 'component_source'
      ),
    [content.literature]
  );

  return (
    <div className="relative flex w-full flex-col">
      <SubtitleBar title="Circuit Provenance" />
      <div className="relative flex w-full flex-col gap-y-12">
        {CIRCUIT_PROVENANCE_LITERATURE.map((publication: PaperLiteratureProps, index: number) => (
          <PublicationCard
            key={`Publication_${publication.doi}`}
            content={publication}
            index={index}
          />
        ))}
      </div>
      <SubtitleBar title="Related artifacts provenance" />
      <div className="relative flex w-full flex-col gap-y-12">
        {CIRCUIT_PROVENANCE_RELATED_ARTIFACTS.map(
          (publication: PaperLiteratureProps, index: number) => (
            <PublicationCard
              key={`Publication_${publication.doi}`}
              content={publication}
              index={index}
            />
          )
        )}
      </div>
    </div>
  );
}
