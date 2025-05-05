type SectionProps = {
  name: string;
  id: 'overview' | 'provenance' | 'related-publications' | 'related-circuits';
};

export default function SectionTabs({
  activeSection,
  setActiveSection,
}: {
  activeSection: 'overview' | 'provenance' | 'related-publications' | 'related-circuits';
  setActiveSection: (
    section: 'overview' | 'provenance' | 'related-publications' | 'related-circuits'
  ) => void;
}) {
  const sections: SectionProps[] = [
    {
      name: 'Overview',
      id: 'overview',
    },
    {
      name: 'Provenance',
      id: 'provenance',
    },
    {
      name: 'Related Publications',
      id: 'related-publications',
    },
    {
      name: 'Related Circuits',
      id: 'related-circuits',
    },
  ];

  return (
    <div className="sticky top-0 z-50 grid h-16 w-full grid-cols-4 bg-[#F3F3F3]">
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
