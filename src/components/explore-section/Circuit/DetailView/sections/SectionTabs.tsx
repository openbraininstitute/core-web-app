export default function SectionTabs({
    activeSection,
    setActiveSection
}:{
    activeSection: 'overview' | 'provenance' | 'related-publications' | 'related-circuits';
    setActiveSection: (section: 'overview' | 'provenance' | 'related-publications' | 'related-circuits') => void;
}) {

    const sections = [
        {
            name: 'Overview',
            id: 'overview'
        },
        {
            name: 'Provenance',
            id: 'provenance'
        },
        {
            name: 'Related Publications',
            id: 'related-publications'
        },
        {
            name: 'Related Circuits',
            id: 'related-circuits'
        }
    ]

    return (
        <div className="relative w-full grid grid-cols-4">
            {
                sections.map((section: {name: string; id: string}) => {
                    return (
                        <button
                            key={section.id}
                            className="w-full text-center text-lg transition-colors duration-300 ease-in-out py-4"
                            style={{
                                color: activeSection === section.id ? 'white' : '#003A8C',
                                background: activeSection === section.id ? '#003A8C' : 'white',
                            }}
                            onClick={() => setActiveSection(section.id as 'overview' | 'provenance' | 'related-publications' | 'related-circuits')}
                            type="button"
                            aria-label={`Go to ${section.name} section`}
                            >
                                {section.name}
                        </button>
                    )
                })
            }
        </div>
    )
}