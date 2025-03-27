'use client';

const sections: string[] = ['overview', 'provenance', 'related publication', 'Related circuits'];

export default function CircuitSectionTabs({
  activeSection,
  setActiveSection,
}: {
  activeSection: 'overview' | 'provenance' | 'related publication' | 'Related circuits';
  setActiveSection: (
    section: 'overview' | 'provenance' | 'related publication' | 'Related circuits'
  ) => void;
}) {
  return (
    <div className="relative mb-12 grid w-full grid-cols-4 border border-solid border-gray-400">
      {sections.map((section: string, index: number) => {
        return (
          <button
            key={section}
            type="button"
            className="py-4 text-center text-xl capitalize"
            style={{
              backgroundColor: activeSection === section ? '#003A8C' : 'white',
              color: activeSection === section ? 'white' : 'black',
              fontWeight: activeSection === section ? 'bold' : 'normal',
              borderLeft: index !== 0 ? '1px solid #9ca3af' : '',
            }}
            onClick={() =>
              setActiveSection(
                section as 'overview' | 'provenance' | 'related publication' | 'Related circuits'
              )
            }
          >
            {section}
          </button>
        );
      })}
    </div>
  );
}
