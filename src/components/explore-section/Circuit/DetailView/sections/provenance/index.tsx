'use client';

import { useState } from 'react';

import { SingleCircuitListView } from '../../../type';
import LiteratureContent from './LiteratureContent';
import RelatedArtifactsContent from './RelatedArtifactsContent';
import Subtabs from './Subtabs';

export default function ProvenanceSection({ content }: { content: SingleCircuitListView }) {
  const [activeSubsection, setActiveSubsection] = useState<'Literature' | 'Related Artifacts'>(
    'Literature'
  );

  let activeSection;

  switch (activeSubsection) {
    case 'Literature':
      activeSection = <LiteratureContent content={content} />;
      break;
    case 'Related Artifacts':
      activeSection = <RelatedArtifactsContent content={content} />;
      break;
    default:
      activeSection = <LiteratureContent content={content} />;
      break;
  }

  return (
    <div className="relative flex w-full flex-col">
      <Subtabs activeSection={activeSubsection} setActiveSection={setActiveSubsection} />
      {activeSection}
    </div>
  );
}
