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
    'visualisation' | 'overview' | 'provenance' | 'related-publications' | 'related-circuits'
  >('visualisation');

  return (
    <div className="relative flex w-full flex-col mt-12">
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
