import { CircuitSchemaProps } from '../../type';
import OverviewSection from './Overview';
import ProvenanceSection from './Provenance';
import RelatedCircuitsSection from './RelatedCircuits';
import RelatedPublicationssSection from './RelatedPublications';
import Visualisation from './Visualisation';

export default function SectionContentBlock({
  content,
  parentCircuit,
  derivedCircuits,
  activeSection,
}: {
  content: CircuitSchemaProps;
  parentCircuit: CircuitSchemaProps | null;
  derivedCircuits: CircuitSchemaProps[] | null;
  activeSection: 'visualisation' | 'overview' | 'provenance' | 'related-publications' | 'related-circuits';
}) {
  let currentSection;

  switch (activeSection) {
    case 'visualisation':
      currentSection = <Visualisation content={content} />;
      break;
    case 'overview':
      currentSection = <OverviewSection content={content} />;
      break;
    case 'provenance':
      currentSection = <ProvenanceSection content={content} />;
      break;
    case 'related-publications':
      currentSection = <RelatedPublicationssSection content={content} />;
      break;
    case 'related-circuits':
      currentSection = (
        <RelatedCircuitsSection
          content={content}
          parentCircuit={parentCircuit}
          derivedCircuits={derivedCircuits}
        />
      );
      break;
    default:
      currentSection = null;
  }

  return <div className="relative flex max-w-full w-full flex-col bg-white p-12">{currentSection}</div>;
}
