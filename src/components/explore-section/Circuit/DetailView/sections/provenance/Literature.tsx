import { useMemo } from 'react';
import { CircuitSchemaProps, PaperLitteratureProps } from '../../../type';
import PublicationCard from '../../literature/PublicationCard';
import SubtitleBar from '../SubtitleBar';

export default function Literature({ content }: { content: CircuitSchemaProps }) {
  const CIRCUIT_PROVENANCE_LITERATURE = useMemo(
    () =>
      content.literature.filter(
        (publication: PaperLitteratureProps) => publication.category === 'circuit_source'
      ),
    [content.literature]
  );

  const CIRCUIT_PROVENANCE_RELATED_ARTIFACTS = useMemo(
    () =>
      content.literature.filter(
        (publication: PaperLitteratureProps) => publication.category === 'component_source'
      ),
    [content.literature]
  );

  return (
    <div className="relative flex w-full flex-col">
      <SubtitleBar title="Circuit Provenance" />
      <div className="relative flex w-full flex-col gap-y-12">
        {CIRCUIT_PROVENANCE_LITERATURE.map((publication: PaperLitteratureProps, index: number) => (
          <PublicationCard
            key={`Publication_${publication.doi}-${index + 1}`}
            content={publication}
            index={index}
          />
        ))}
      </div>
      <SubtitleBar title="Related artifacts provenance" />
      <div className="relative flex w-full flex-col gap-y-12">
        {CIRCUIT_PROVENANCE_RELATED_ARTIFACTS.map(
          (publication: PaperLitteratureProps, index: number) => (
            <PublicationCard
              key={`Publication_${publication.doi}-${index + 1}`}
              content={publication}
              index={index}
            />
          )
        )}
      </div>
    </div>
  );
}
