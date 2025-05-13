import { useState } from 'react';
import { CircuitSchemaProps } from '../../type';

import SectionContentBlock from './section-content-bloc';
import SectionTabs from './section-tabs';

export default function SectionMainContainer({
  content,
  parentCircuit,
  derivedCircuits,
}: {
  content: CircuitSchemaProps;
  parentCircuit: CircuitSchemaProps | null;
  derivedCircuits: CircuitSchemaProps[] | null;
}) {
  const [activeSection, setActiveSection] = useState<
    'overview' | 'provenance' | 'related-publications' | 'related-circuits'
  >('overview');

  return (
    <div className="relative flex w-full flex-col">
      <SectionTabs activeSection={activeSection} setActiveSection={setActiveSection} />
      <SectionContentBlock
        content={content}
        parentCircuit={parentCircuit}
        derivedCircuits={derivedCircuits}
        activeSection={activeSection}
      />
    </div>
  );
}
