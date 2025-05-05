import { CircuitSchemaProps } from '../../type';
import OverviewSection from './Overview';
import ProvenanceSection from './Provenance';
import RelatedCircuitsSection from './RelatedCircuits';
import RelatedPublicationssSection from './RelatedPublications';

export default function SectionContentBlock({
  content,
  activeSection,
}: {
  content: CircuitSchemaProps;
  activeSection: 'overview' | 'provenance' | 'related-publications' | 'related-circuits';
}) {
  let currentSection;

  switch (activeSection) {
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
      currentSection = <RelatedCircuitsSection content={content} />;
      break;
    default:
      currentSection = null;
  }

  return <div className="relative z-10 flex w-full flex-col bg-white p-12">{currentSection}</div>;
}
