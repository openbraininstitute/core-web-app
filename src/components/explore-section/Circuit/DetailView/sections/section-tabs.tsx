import {
  ActiveSection,
  SECTION_OVERVIEW,
  SECTION_PROVENANCE,
  SECTION_RELATED_CIRCUITS,
  SECTION_RELATED_PUBLICATIONS,
} from '../../type/sectionTypes';

type SectionProps = {
  name: string;
  id: ActiveSection;
};

export default function SectionTabs({
  activeSection,
  setActiveSection,
}: {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
}) {
  const sections: SectionProps[] = [
    {
      name: 'Overview',
      id: SECTION_OVERVIEW,
    },
    {
      name: 'Provenance',
      id: SECTION_PROVENANCE,
    },
    {
      name: 'Related Publications',
      id: SECTION_RELATED_PUBLICATIONS,
    },
    {
      name: 'Related Circuits',
      id: SECTION_RELATED_CIRCUITS,
    },
  ];

  return (
    <div className="relative top-0 grid h-16 w-full grid-cols-4 bg-[#F3F3F3]">
      {sections.map((section: SectionProps) => {
        return (
          <button
            key={section.id}
            className="w-full py-4 text-center text-xl text-primary-9 transition-colors duration-300 ease-in-out"
            style={{
              fontWeight: activeSection === section.id ? 'bold' : 'normal',
              background: activeSection === section.id ? 'white' : 'transparent',
            }}
            onClick={() => setActiveSection(section.id)}
            type="button"
            aria-label={`Go to ${section.name} section`}
          >
            {section.name}
          </button>
        );
      })}
    </div>
  );
}
