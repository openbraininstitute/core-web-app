'use client'

import { useState } from 'react';
import { CircuitSchemaProps } from '../../../type';
import Literature from './Literature';
import RelatedArtifacts from './RelatedArtifacts';

export type ProvenanceSubsectionProps = {
  name: string;
  id: 'literature' | 'related artifacts';
};

export default function ProvenanceSection({ content }: { content: CircuitSchemaProps }) {
  const subsections: ProvenanceSubsectionProps[] = [
    { name: 'Literature', id: 'literature' },
    { name: 'Related artifacts', id: 'related artifacts' },
  ];

  const [currentSubsection, setCurrentSubsection] = useState<'literature' | 'related artifacts'>(
    'literature'
  );

  let displayedContent;

  switch (currentSubsection) {
    case 'literature':
      displayedContent = <Literature content={content} />;
      break;
    case 'related artifacts':
      displayedContent = <RelatedArtifacts />;
      break;
    default:
      displayedContent = <Literature content={content} />;
      break;
  }

  return (
    <div className="relative flex w-full flex-col">
      <div className="relative mb-12 grid w-full grid-cols-2">
        {subsections.map((subsection: ProvenanceSubsectionProps) => (
          <button
            type="button"
            key={subsection.id}
            className="relative flex w-full items-center justify-center py-4 text-lg"
            onClick={() => setCurrentSubsection(subsection.id)}
            aria-label="Provenance subsection"
            aria-current={currentSubsection === subsection.id ? 'true' : 'false'}
            style={{
              color: currentSubsection === subsection.id ? 'white' : '#003A8C',
              background: currentSubsection === subsection.id ? '#003A8C' : 'white',
            }}
          >
            {subsection.name}
          </button>
        ))}
      </div>

      {displayedContent}
    </div>
  );
}